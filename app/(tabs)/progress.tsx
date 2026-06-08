import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useState } from 'react';
import Svg, { Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { getRollingBaseline, hasEnoughRides } from '../../lib/analytics';
import { getRideSessions } from '../../lib/storage';

function scoreColor(score: number): string {
  if (score < 0) return '#555555';
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FF9800';
  return '#F44336';
}

function BaselineDial({ label, score }: { label: string; score: number }) {
  const SIZE = 120;
  const r = 44;
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
          strokeWidth={10}
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
            strokeWidth={10}
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
          fontSize={22}
          fontWeight="bold"
        >
          {score >= 0 ? String(Math.round(score)) : '—'}
        </SvgText>
      </Svg>
      <Text style={styles.dialLabel}>{label}</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const [baseline, setBaseline] = useState<{ braking: number; throttle: number; lean: number } | null>(null);
  const [rideCount, setRideCount] = useState(0);
  const [enough, setEnough] = useState(false);

  useFocusEffect(() => {
    setBaseline(getRollingBaseline());
    setRideCount(getRideSessions().length);
    setEnough(hasEnoughRides());
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Your Baseline</Text>
        <Text style={styles.subtitle}>10-ride rolling average</Text>

        {enough && baseline ? (
          <>
            <View style={styles.dialsRow}>
              <BaselineDial label="Braking" score={baseline.braking} />
              <BaselineDial label="Throttle" score={baseline.throttle} />
              <BaselineDial label="Cornering" score={baseline.lean} />
            </View>
            <View style={styles.rideCountRow}>
              <Text style={styles.rideCountText}>{rideCount} rides recorded</Text>
            </View>
            <View style={styles.hint}>
              <Text style={styles.hintText}>
                Tap any ride in History to see detailed scores and compare against this baseline.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.waitBanner}>
            <Text style={styles.waitTitle}>Building your baseline</Text>
            <Text style={styles.waitBody}>
              Ride {rideCount}/3 complete. Complete {3 - rideCount} more ride{3 - rideCount !== 1 ? 's' : ''} to unlock your skill scores.
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(rideCount / 3) * 100}%` }]} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    paddingTop: 16,
    marginBottom: 2,
  },
  subtitle: {
    color: '#666666',
    fontSize: 13,
    marginBottom: 28,
  },
  dialsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  dial: {
    alignItems: 'center',
    gap: 6,
  },
  dialLabel: {
    color: '#AAAAAA',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rideCountRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  rideCountText: {
    color: '#555555',
    fontSize: 13,
  },
  hint: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 16,
  },
  hintText: {
    color: '#666666',
    fontSize: 13,
    lineHeight: 19,
  },
  waitBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 24,
    gap: 12,
  },
  waitTitle: {
    color: '#FF6B35',
    fontSize: 17,
    fontWeight: '700',
  },
  waitBody: {
    color: '#888888',
    fontSize: 14,
    lineHeight: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
});
