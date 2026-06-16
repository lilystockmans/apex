import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import type { Achievement } from '../lib/achievements';

interface Props {
  achievement: Achievement;
  username: string;
  level: string;
}

function levelColor(level: string): string {
  switch (level) {
    case 'street': return '#60A5FA';
    case 'confident': return '#34D399';
    case 'pre-track': return '#F59E0B';
    case 'track-ready': return '#FF6B35';
    default: return '#9CA3AF';
  }
}

function levelLabel(level: string): string {
  switch (level) {
    case 'street': return 'Street';
    case 'confident': return 'Confident';
    case 'pre-track': return 'Pre-Track';
    case 'track-ready': return 'Track Ready';
    default: return 'Novice';
  }
}

export function AchievementCard({ achievement, username, level }: Props) {
  const ref = useRef<ViewShot>(null);
  const lc = levelColor(level);

  async function shareCard() {
    try {
      const uri = await ref.current?.capture?.();
      if (!uri) return;
      await Share.share({
        url: uri,
        message: `I just earned "${achievement.title}" on Apex 🏍️`,
      });
    } catch (err: any) {
      Alert.alert('Share failed', err?.message ?? 'Unknown error');
    }
  }

  return (
    <View style={styles.wrapper}>
      <ViewShot ref={ref} options={{ format: 'png', quality: 1.0 }}>
        <View style={styles.card}>
          {/* Background accent */}
          <View style={[styles.cardAccent, { backgroundColor: lc + '22' }]} />

          {/* App brand */}
          <Text style={styles.brand}>APEX</Text>

          {/* Achievement icon */}
          <Text style={styles.icon}>{achievement.icon}</Text>

          {/* Achievement title */}
          <Text style={styles.achievementTitle}>{achievement.title}</Text>
          <Text style={styles.achievementDesc}>{achievement.description}</Text>

          {/* Rider info */}
          <View style={styles.riderRow}>
            <View style={[styles.levelPip, { backgroundColor: lc }]} />
            <Text style={styles.riderName}>{username}</Text>
            <Text style={[styles.riderLevel, { color: lc }]}>{levelLabel(level)}</Text>
          </View>
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.shareBtn} onPress={shareCard} activeOpacity={0.8}>
        <Text style={styles.shareBtnText}>Share to Instagram Stories</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 16 },
  card: {
    width: 300,
    backgroundColor: '#0F0F0F',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  brand: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 20,
  },
  icon: { fontSize: 56, marginBottom: 16 },
  achievementTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementDesc: {
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelPip: { width: 8, height: 8, borderRadius: 4 },
  riderName: { color: '#CCCCCC', fontSize: 14, fontWeight: '600' },
  riderLevel: { fontSize: 13, fontWeight: '700' },
  shareBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: 300,
    alignItems: 'center',
  },
  shareBtnText: { color: '#000000', fontWeight: '700', fontSize: 15 },
});
