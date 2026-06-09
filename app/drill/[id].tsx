import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle as SvgCircle, Line as SvgLine, Polyline } from 'react-native-svg';
import { useMemo } from 'react';
import { DRILLS, Drill } from '../../data/drills';
import { kvGet } from '../../lib/storage';
import { getRideSessions, getRidePoints } from '../../lib/storage';
import { scoreRide } from '../../lib/analytics';
import { RideSession } from '../../types/ride';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score < 0) return '#555555';
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FF9800';
  return '#F44336';
}

function metricLabel(metric: 'braking' | 'throttle' | 'lean'): string {
  switch (metric) {
    case 'braking': return 'Braking';
    case 'throttle': return 'Throttle';
    case 'lean': return 'Cornering';
  }
}

function metricBadgeColor(metric: 'braking' | 'throttle' | 'lean'): string {
  switch (metric) {
    case 'braking': return '#C0392B';
    case 'throttle': return '#2980B9';
    case 'lean': return '#27AE60';
  }
}

// ─── Mini Trend Chart ─────────────────────────────────────────────────────────

const CHART_W = 300;
const CHART_H = 64;
const PAD_X = 8;
const PAD_Y = 8;

function MiniChart({ scores, color }: { scores: number[]; color: string }) {
  if (scores.length < 2) return null;

  const innerW = CHART_W - PAD_X * 2;
  const innerH = CHART_H - PAD_Y * 2;
  const xOf = (i: number) => PAD_X + (i / (scores.length - 1)) * innerW;
  const yOf = (v: number) => PAD_Y + (1 - Math.max(0, Math.min(100, v)) / 100) * innerH;

  const polyPoints = scores.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const avgY = yOf(scores.reduce((s, v) => s + v, 0) / scores.length);

  return (
    <View style={styles.miniChartWrap}>
      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <SvgLine
          x1={PAD_X} y1={avgY}
          x2={CHART_W - PAD_X} y2={avgY}
          stroke="#333333"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Polyline
          points={polyPoints}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {scores.map((v, i) => (
          <SvgCircle key={i} cx={xOf(i)} cy={yOf(v)} r={3} fill={color} />
        ))}
      </Svg>
      <View style={styles.miniChartRow}>
        <Text style={styles.miniChartLabel}>Rides since drill started</Text>
        <Text style={[styles.miniChartValue, { color }]}>
          {Math.round(scores[scores.length - 1])} now
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DrillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const drill: Drill | undefined = useMemo(
    () => DRILLS.find(d => d.id === id),
    [id]
  );

  const { drillScores, startedAt } = useMemo(() => {
    if (!drill) return { drillScores: [], startedAt: null };

    const raw = kvGet('active_drill');
    let startTs: number | null = null;
    let isActive = false;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.drillId === drill.id) {
          startTs = parsed.startedAt;
          isActive = true;
        }
      } catch {}
    }

    if (!isActive || !startTs) return { drillScores: [], startedAt: null };

    const sessions = getRideSessions().filter((s: RideSession) => s.started_at >= startTs!);
    const scores = sessions.map((s: RideSession) => {
      const sc = scoreRide(s.id);
      return sc[drill.focusMetric];
    }).filter(v => v >= 0);

    return { drillScores: scores, startedAt: startTs };
  }, [drill]);

  const daysLeft = useMemo(() => {
    if (!drill || !startedAt) return null;
    const elapsed = (Date.now() - startedAt) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(drill.durationDays - elapsed));
  }, [drill, startedAt]);

  if (!drill) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.errorText}>Drill not found.</Text>
      </SafeAreaView>
    );
  }

  const badgeColor = metricBadgeColor(drill.focusMetric);
  const chartColor = scoreColor(drillScores.length > 0 ? drillScores[drillScores.length - 1] : -1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={[styles.metricBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.metricBadgeText}>{metricLabel(drill.focusMetric)}</Text>
          </View>
          {daysLeft !== null && (
            <Text style={styles.daysLeft}>{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining</Text>
          )}
        </View>
        <Text style={styles.drillTitle}>{drill.title}</Text>
        <Text style={styles.shortDesc}>{drill.shortDescription}</Text>

        {/* Why this matters */}
        <Text style={styles.sectionTitle}>Why This Matters</Text>
        <View style={styles.theoryBox}>
          <Text style={styles.theoryText}>{drill.theory}</Text>
        </View>

        {/* Step-by-step */}
        <Text style={styles.sectionTitle}>What To Do</Text>
        <View style={styles.stepsBox}>
          {drill.instructions.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: badgeColor }]}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* How you're doing */}
        {drillScores.length >= 2 && (
          <>
            <Text style={styles.sectionTitle}>How You're Doing</Text>
            <View style={styles.chartBox}>
              <MiniChart scores={drillScores} color={chartColor} />
            </View>
          </>
        )}

        {drillScores.length > 0 && drillScores.length < 2 && (
          <>
            <Text style={styles.sectionTitle}>How You're Doing</Text>
            <View style={styles.chartBox}>
              <Text style={styles.oneRideText}>
                {metricLabel(drill.focusMetric)}: {Math.round(drillScores[0])} after 1 ride.
                Complete more rides to see your trend.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  backRow: { paddingTop: 12, paddingBottom: 8 },
  backText: { color: '#FF6B35', fontSize: 16 },
  errorText: { color: '#888888', fontSize: 16, textAlign: 'center', marginTop: 60 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  metricBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  metricBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysLeft: { color: '#888888', fontSize: 13 },
  drillTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  shortDesc: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#AAAAAA',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  theoryBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 16,
  },
  theoryText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 22,
  },
  stepsBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 16,
    gap: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  chartBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 10,
  },
  miniChartWrap: { gap: 4 },
  miniChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  miniChartLabel: { color: '#666666', fontSize: 11 },
  miniChartValue: { fontSize: 13, fontWeight: '700' },
  oneRideText: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 20,
    padding: 6,
  },
});
