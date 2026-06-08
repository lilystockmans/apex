import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle as SvgCircle, Polyline, Text as SvgText } from 'react-native-svg';
import { useMemo } from 'react';
import { getRideSessionById, getRidePoints } from '../../lib/storage';
import { scoreRide, getRollingBaseline, hasEnoughRides } from '../../lib/analytics';
import { RidePoint } from '../../types/ride';

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres)} m`;
}

// ─── Score dial ───────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score < 0) return '#555555';
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FF9800';
  return '#F44336';
}

function ScoreDial({ label, score }: { label: string; score: number }) {
  const SIZE = 110;
  const r = 40;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circumference = 2 * Math.PI * r;
  const trackLength = circumference * (270 / 360);
  const scoreLength = score >= 0 ? (score / 100) * trackLength : 0;
  const color = scoreColor(score);

  return (
    <View style={styles.dial}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <SvgCircle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#2A2A2A"
          strokeWidth={9}
          strokeDasharray={`${trackLength} ${circumference - trackLength}`}
          strokeLinecap="round"
          rotation={135}
          origin={`${cx}, ${cy}`}
        />
        {score >= 0 && (
          <SvgCircle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeDasharray={`${scoreLength} ${circumference - scoreLength}`}
            strokeLinecap="round"
            rotation={135}
            origin={`${cx}, ${cy}`}
          />
        )}
        <SvgText
          x={cx} y={cy + 7}
          textAnchor="middle"
          fill={score >= 0 ? '#FFFFFF' : '#555555'}
          fontSize={20}
          fontWeight="bold"
        >
          {score >= 0 ? String(score) : '—'}
        </SvgText>
      </Svg>
      <Text style={styles.dialLabel}>{label}</Text>
    </View>
  );
}

// ─── Trend arrow ─────────────────────────────────────────────────────────────

function TrendArrow({ score, baseline }: { score: number; baseline: number }) {
  if (score < 0) return null;
  const diff = score - baseline;
  if (diff > 3) return <Text style={[styles.trend, { color: '#4CAF50' }]}>↑ {Math.round(diff)}</Text>;
  if (diff < -3) return <Text style={[styles.trend, { color: '#F44336' }]}>↓ {Math.abs(Math.round(diff))}</Text>;
  return <Text style={[styles.trend, { color: '#888888' }]}>→</Text>;
}

// ─── Road type badge ─────────────────────────────────────────────────────────

const ROAD_COLORS: Record<string, string> = {
  urban: '#FF9800',
  twisty: '#4CAF50',
  highway: '#2196F3',
  mixed: '#9E9E9E',
};

function RoadBadge({ type }: { type: string }) {
  return (
    <View style={[styles.roadBadge, { backgroundColor: ROAD_COLORS[type] ?? '#9E9E9E' }]}>
      <Text style={styles.roadBadgeText}>{type}</Text>
    </View>
  );
}

// ─── Route map ────────────────────────────────────────────────────────────────

const MAP_W = 320;
const MAP_H = 160;
const MAP_PAD = 12;

function buildPolylinePoints(gpsPoints: RidePoint[]): string {
  if (gpsPoints.length < 2) return '';

  const lats = gpsPoints.map(p => p.lat);
  const lons = gpsPoints.map(p => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latRange = maxLat - minLat || 0.001;
  const lonRange = maxLon - minLon || 0.001;
  const innerW = MAP_W - MAP_PAD * 2;
  const innerH = MAP_H - MAP_PAD * 2;
  const scale = Math.min(innerW / lonRange, innerH / latRange);
  const offsetX = MAP_PAD + (innerW - lonRange * scale) / 2;
  const offsetY = MAP_PAD + (innerH - latRange * scale) / 2;

  return gpsPoints.map(p => {
    const x = offsetX + (p.lon - minLon) * scale;
    const y = offsetY + (maxLat - p.lat) * scale;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function RouteMap({ points, brakingScore }: { points: RidePoint[]; brakingScore: number }) {
  const gpsPoints = points.filter(p => !p.gps_lost && p.lat !== 0 && p.lon !== 0);
  const polylinePoints = useMemo(() => buildPolylinePoints(gpsPoints), [gpsPoints]);

  if (gpsPoints.length < 2) {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>No GPS data</Text>
      </View>
    );
  }

  const routeColor = scoreColor(brakingScore);

  return (
    <View style={styles.mapContainer}>
      <Svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <Polyline
          points={polylinePoints}
          stroke={routeColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      </Svg>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const session = useMemo(() => getRideSessionById(id), [id]);
  const allPoints = useMemo(() => getRidePoints(id), [id]);
  const scores = useMemo(() => scoreRide(id), [id]);
  const baseline = useMemo(() => getRollingBaseline(), []);
  const enoughRides = useMemo(() => hasEnoughRides(), []);

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Ride not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.dateText}>{formatDate(session.started_at)}</Text>
        <Text style={styles.timeText}>{formatTime(session.started_at)}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDistance(session.distance_m)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDuration(session.duration_s)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <RoadBadge type={enoughRides ? scores.roadType : 'mixed'} />
            <Text style={styles.statLabel}>Road type</Text>
          </View>
        </View>

        {/* Scores or baseline-building banner */}
        {enoughRides ? (
          <>
            <Text style={styles.sectionTitle}>Skill Scores</Text>

            <View style={styles.dialsRow}>
              <ScoreDial label="Braking" score={scores.braking} />
              <ScoreDial label="Throttle" score={scores.throttle} />
              <ScoreDial label="Cornering" score={scores.lean} />
            </View>

            {baseline && (
              <View style={styles.trendRow}>
                <View style={styles.trendCell}>
                  <Text style={styles.trendLabel}>vs baseline</Text>
                  <TrendArrow score={scores.braking} baseline={baseline.braking} />
                </View>
                <View style={styles.trendCell}>
                  <Text style={styles.trendLabel}>vs baseline</Text>
                  <TrendArrow score={scores.throttle} baseline={baseline.throttle} />
                </View>
                <View style={styles.trendCell}>
                  <Text style={styles.trendLabel}>vs baseline</Text>
                  <TrendArrow score={scores.lean} baseline={baseline.lean} />
                </View>
              </View>
            )}

            <View style={styles.eventRow}>
              <Text style={styles.eventText}>
                {scores.brakingEvents === 0
                  ? 'No braking events detected'
                  : `${scores.brakingEvents} braking event${scores.brakingEvents !== 1 ? 's' : ''} detected`}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Route</Text>
            <RouteMap points={allPoints} brakingScore={scores.braking} />
          </>
        ) : (
          <View style={styles.baselineBanner}>
            <Text style={styles.baselineTitle}>Building your baseline</Text>
            <Text style={styles.baselineBody}>
              Scores appear after 3 rides. Keep riding — the more data you give it, the more accurate your coaching will be.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  errorText: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 60,
  },
  backRow: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  backText: {
    color: '#FF6B35',
    fontSize: 16,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  timeText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 2,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#2A2A2A',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#666666',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roadBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  dialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  dial: {
    alignItems: 'center',
    gap: 4,
  },
  dialLabel: {
    color: '#AAAAAA',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  trendCell: {
    alignItems: 'center',
    width: 110,
    gap: 2,
  },
  trendLabel: {
    color: '#555555',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trend: {
    fontSize: 16,
    fontWeight: '700',
  },
  eventRow: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  eventText: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  mapContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 8,
  },
  mapPlaceholder: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    height: MAP_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    color: '#555555',
    fontSize: 13,
  },
  baselineBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    gap: 8,
  },
  baselineTitle: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
  baselineBody: {
    color: '#888888',
    fontSize: 14,
    lineHeight: 20,
  },
});
