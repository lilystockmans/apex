import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle as SvgCircle, Line as SvgLine, Polyline } from 'react-native-svg';
import { getRollingBaseline, hasEnoughRides, scoreRide } from '../../lib/analytics';
import { getRideSessions, kvGet } from '../../lib/storage';
import { getCurrentLevel, getNextLevel, getNextLevelConditions, Level, LevelCondition } from '../../lib/curriculum';
import { getActiveDrill, assignDrill } from '../../lib/insights';
import { Drill } from '../../data/drills';
import { RideSession } from '../../types/ride';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeWindow = 7 | 30 | 90;
type ScorePoint = { ts: number; braking: number; throttle: number; lean: number };

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

function daysRemaining(drill: Drill, startedAt: number): number {
  const elapsed = (Date.now() - startedAt) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(drill.durationDays - elapsed));
}

// ─── Level Badge ──────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: Level }) {
  return (
    <View style={styles.levelBadgeRow}>
      <View style={[styles.levelCircle, { borderColor: level.color }]}>
        <Text style={[styles.levelCircleText, { color: level.color }]}>{level.label[0]}</Text>
      </View>
      <View style={styles.levelInfo}>
        <Text style={[styles.levelLabel, { color: level.color }]}>{level.label}</Text>
        <Text style={styles.levelDesc}>{level.description}</Text>
      </View>
    </View>
  );
}

// ─── Next Level Progress ──────────────────────────────────────────────────────

function NextLevelProgress({ conditions, nextLevel }: { conditions: LevelCondition[]; nextLevel: Level }) {
  const metCount = conditions.filter(c => c.met).length;
  const percent = conditions.length > 0 ? (metCount / conditions.length) * 100 : 0;

  return (
    <View style={styles.nextLevelCard}>
      <View style={styles.nextLevelHeader}>
        <Text style={styles.nextLevelTitle}>Next: {nextLevel.label}</Text>
        <Text style={styles.nextLevelPercent}>{metCount}/{conditions.length}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` as any, backgroundColor: nextLevel.color }]} />
      </View>
      <View style={styles.conditionList}>
        {conditions.map((c, i) => (
          <View key={i} style={styles.conditionRow}>
            <Text style={[styles.conditionDot, { color: c.met ? '#4CAF50' : '#555555' }]}>
              {c.met ? '✓' : '○'}
            </Text>
            <Text style={[styles.conditionLabel, { color: c.met ? '#CCCCCC' : '#666666' }]}>
              {c.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────

const CHART_W = 300;
const CHART_H = 72;
const CHART_PAD_X = 8;
const CHART_PAD_Y = 8;

function TrendChart({
  points,
  metricKey,
  baseline,
}: {
  points: ScorePoint[];
  metricKey: 'braking' | 'throttle' | 'lean';
  baseline: number;
}) {
  const data = points.map(p => p[metricKey]).filter(v => v >= 0);

  if (data.length < 2) {
    return (
      <View style={[styles.chartContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.chartMetricLabel}>{metricLabel(metricKey)}</Text>
        <Text style={styles.chartNoData}>Not enough data for this window</Text>
      </View>
    );
  }

  const innerW = CHART_W - CHART_PAD_X * 2;
  const innerH = CHART_H - CHART_PAD_Y * 2;
  const xOf = (i: number) => CHART_PAD_X + (i / (data.length - 1)) * innerW;
  const yOf = (v: number) => CHART_PAD_Y + (1 - v / 100) * innerH;

  const polyPoints = data.map((v, i) => `${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ');
  const baseY = yOf(Math.min(100, Math.max(0, baseline)));
  const color = scoreColor(data[data.length - 1]);

  return (
    <View style={styles.chartContainer}>
      <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <SvgLine
          x1={CHART_PAD_X} y1={baseY}
          x2={CHART_W - CHART_PAD_X} y2={baseY}
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
        {data.map((v, i) => (
          <SvgCircle key={i} cx={xOf(i)} cy={yOf(v)} r={3} fill={color} />
        ))}
      </Svg>
      <View style={styles.chartFooter}>
        <Text style={styles.chartMetricLabel}>{metricLabel(metricKey)}</Text>
        <Text style={[styles.chartCurrentScore, { color }]}>
          {Math.round(data[data.length - 1])}
        </Text>
      </View>
    </View>
  );
}

// ─── Drill Card ───────────────────────────────────────────────────────────────

function DrillCard({ drill, startedAt, onPress }: { drill: Drill; startedAt: number; onPress: () => void }) {
  const days = daysRemaining(drill, startedAt);
  return (
    <TouchableOpacity style={styles.drillCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.drillCardHeader}>
        <View style={[styles.metricBadge, { backgroundColor: metricBadgeColor(drill.focusMetric) }]}>
          <Text style={styles.metricBadgeText}>{metricLabel(drill.focusMetric)}</Text>
        </View>
        <Text style={styles.drillDaysLeft}>{days} day{days !== 1 ? 's' : ''} left</Text>
      </View>
      <Text style={styles.drillTitle}>{drill.title}</Text>
      <Text style={styles.drillShortDesc}>{drill.shortDescription}</Text>
      <Text style={styles.drillTapHint}>Tap for full instructions →</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const router = useRouter();

  const [level, setLevel] = useState<Level | null>(null);
  const [nextLevel, setNextLevel] = useState<Level | null>(null);
  const [conditions, setConditions] = useState<LevelCondition[]>([]);
  const [baseline, setBaseline] = useState<{ braking: number; throttle: number; lean: number } | null>(null);
  const [activeDrill, setActiveDrill] = useState<Drill | null>(null);
  const [drillStartedAt, setDrillStartedAt] = useState<number>(Date.now());
  const [trendWindow, setTrendWindow] = useState<TimeWindow>(30);
  const [trendData, setTrendData] = useState<ScorePoint[]>([]);
  const [enough, setEnough] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLevel(getCurrentLevel());
      setNextLevel(getNextLevel());
      setConditions(getNextLevelConditions());
      setBaseline(getRollingBaseline());
      setEnough(hasEnoughRides());

      let drill = getActiveDrill();
      if (!drill && hasEnoughRides()) {
        drill = assignDrill();
      }
      setActiveDrill(drill);

      if (drill) {
        const raw = kvGet('active_drill');
        if (raw) {
          try {
            const { startedAt } = JSON.parse(raw);
            setDrillStartedAt(startedAt ?? Date.now());
          } catch {
            setDrillStartedAt(Date.now());
          }
        }
      }

      const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const sessions = getRideSessions().filter((s: RideSession) => s.started_at >= cutoff90);
      const scored: ScorePoint[] = sessions.map((s: RideSession) => {
        const sc = scoreRide(s.id);
        return { ts: s.started_at, braking: sc.braking, throttle: sc.throttle, lean: sc.lean };
      });
      setTrendData(scored);
    }, [])
  );

  const filteredTrend = trendData.filter(p => {
    const cutoff = Date.now() - trendWindow * 24 * 60 * 60 * 1000;
    return p.ts >= cutoff;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Progress</Text>

        {level && <LevelBadge level={level} />}

        {nextLevel && conditions.length > 0 && (
          <NextLevelProgress conditions={conditions} nextLevel={nextLevel} />
        )}

        {!nextLevel && (
          <View style={styles.maxLevelBanner}>
            <Text style={styles.maxLevelText}>Track Ready — maximum level reached.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Active Drill</Text>
        {activeDrill ? (
          <DrillCard
            drill={activeDrill}
            startedAt={drillStartedAt}
            onPress={() => router.push(`/drill/${activeDrill.id}`)}
          />
        ) : (
          <View style={styles.noDrillCard}>
            <Text style={styles.noDrillText}>
              {enough
                ? 'No active drill — all metrics are above threshold.'
                : 'Complete 3 rides to unlock your first drill.'}
            </Text>
          </View>
        )}

        {enough && baseline && trendData.length >= 2 && (
          <>
            <Text style={styles.sectionTitle}>Score Trends</Text>
            <View style={styles.windowSelector}>
              {([7, 30, 90] as TimeWindow[]).map(w => (
                <TouchableOpacity
                  key={w}
                  style={[styles.windowBtn, trendWindow === w && styles.windowBtnActive]}
                  onPress={() => setTrendWindow(w)}
                >
                  <Text style={[styles.windowBtnText, trendWindow === w && styles.windowBtnTextActive]}>
                    {w}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TrendChart points={filteredTrend} metricKey="braking" baseline={baseline.braking} />
            <TrendChart points={filteredTrend} metricKey="throttle" baseline={baseline.throttle} />
            <TrendChart points={filteredTrend} metricKey="lean" baseline={baseline.lean} />
          </>
        )}

        {!enough && (
          <View style={styles.waitBanner}>
            <Text style={styles.waitTitle}>Building your baseline</Text>
            <Text style={styles.waitBody}>
              Complete 3 rides to unlock skill scores and trend charts.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    paddingTop: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 10,
  },
  levelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  levelCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCircleText: { fontSize: 22, fontWeight: '800' },
  levelInfo: { flex: 1 },
  levelLabel: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  levelDesc: { color: '#888888', fontSize: 13, lineHeight: 18 },
  nextLevelCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
  },
  nextLevelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextLevelTitle: { color: '#CCCCCC', fontSize: 14, fontWeight: '600' },
  nextLevelPercent: { color: '#888888', fontSize: 13 },
  progressTrack: {
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: { height: 4, borderRadius: 2 },
  conditionList: { gap: 6 },
  conditionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  conditionDot: { fontSize: 13, fontWeight: '700', width: 14, textAlign: 'center' },
  conditionLabel: { fontSize: 13 },
  maxLevelBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
  },
  maxLevelText: { color: '#FF6B35', fontSize: 14, fontWeight: '600' },
  drillCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  drillCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  metricBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drillDaysLeft: { color: '#888888', fontSize: 12 },
  drillTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  drillShortDesc: { color: '#AAAAAA', fontSize: 13, lineHeight: 18 },
  drillTapHint: { color: '#FF6B35', fontSize: 12, marginTop: 4 },
  noDrillCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
  },
  noDrillText: { color: '#666666', fontSize: 14, lineHeight: 20 },
  windowSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  windowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
  },
  windowBtnActive: { backgroundColor: '#FF6B35' },
  windowBtnText: { color: '#888888', fontSize: 13, fontWeight: '600' },
  windowBtnTextActive: { color: '#FFFFFF' },
  chartContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    minHeight: CHART_H + 32,
  },
  chartNoData: { color: '#555555', fontSize: 12, marginTop: 4 },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  chartMetricLabel: {
    color: '#888888',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartCurrentScore: { fontSize: 15, fontWeight: '700' },
  waitBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 24,
    gap: 10,
    marginTop: 8,
  },
  waitTitle: { color: '#FF6B35', fontSize: 17, fontWeight: '700' },
  waitBody: { color: '#888888', fontSize: 14, lineHeight: 20 },
});
