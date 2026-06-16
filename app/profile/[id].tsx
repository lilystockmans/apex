import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { ACHIEVEMENTS } from '../../lib/achievements';
import type { Session } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  username: string;
  current_level: string;
  total_distance_m: number;
  avg_braking_score: number | null;
  avg_throttle_score: number | null;
  avg_lean_score: number | null;
}

interface PublicRide {
  id: string;
  started_at: string;
  distance_m: number;
  duration_s: number;
}

interface EarnedAchievement {
  id: string;
  earned_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDistance(m: number): string {
  return `${(m / 1000).toFixed(0)}km`;
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  return `${m}min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function scoreColor(score: number | null): string {
  if (score === null) return '#555555';
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FF9800';
  return '#F44336';
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rides, setRides] = useState<PublicRide[]>([]);
  const [earned, setEarned] = useState<EarnedAchievement[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadProfile(data.session);
    });
  }, [id]);

  async function loadProfile(currentSession: Session | null) {
    if (!id) return;
    setLoading(true);
    try {
      const [profileRes, ridesRes, achsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, current_level, total_distance_m, avg_braking_score, avg_throttle_score, avg_lean_score')
          .eq('id', id)
          .single(),
        supabase
          .from('rides')
          .select('id, started_at, distance_m, duration_s')
          // No GPS data — only aggregate stats are public
          .eq('user_id', id)
          .order('started_at', { ascending: false })
          .limit(10),
        supabase
          .from('achievements')
          .select('id, earned_at')
          .eq('user_id', id)
          .order('earned_at', { ascending: false }),
      ]);

      setProfile(profileRes.data as Profile);
      setRides((ridesRes.data ?? []) as PublicRide[]);
      setEarned((achsRes.data ?? []) as EarnedAchievement[]);

      if (currentSession) {
        const { data: followRow } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentSession.user.id)
          .eq('following_id', id)
          .single();
        setIsFollowing(!!followRow);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowToggle() {
    if (!session) {
      router.push('/auth/sign-in');
      return;
    }
    if (!id) return;

    setFollowLoading(true);
    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', id);
      if (!error) setIsFollowing(false);
      else Alert.alert('Error', 'Could not unfollow: ' + error.message);
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: session.user.id, following_id: id });
      if (!error) setIsFollowing(true);
      else Alert.alert('Error', 'Could not follow: ' + error.message);
    }
    setFollowLoading(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingState}>
          <Text style={styles.errorText}>Rider not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = session?.user.id === profile.id;
  const lc = levelColor(profile.current_level);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatarCircle, { borderColor: lc }]}>
            <Text style={[styles.avatarLetter, { color: lc }]}>
              {(profile.username ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{profile.username}</Text>
            <View style={[styles.levelBadge, { backgroundColor: lc + '33', borderColor: lc }]}>
              <Text style={[styles.levelBadgeText, { color: lc }]}>
                {levelLabel(profile.current_level)}
              </Text>
            </View>
          </View>
          {!isOwnProfile && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDistance(profile.total_distance_m ?? 0)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: scoreColor(profile.avg_braking_score) }]}>
              {profile.avg_braking_score != null ? Math.round(profile.avg_braking_score) : '—'}
            </Text>
            <Text style={styles.statLabel}>Braking</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: scoreColor(profile.avg_throttle_score) }]}>
              {profile.avg_throttle_score != null ? Math.round(profile.avg_throttle_score) : '—'}
            </Text>
            <Text style={styles.statLabel}>Throttle</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: scoreColor(profile.avg_lean_score) }]}>
              {profile.avg_lean_score != null ? Math.round(profile.avg_lean_score) : '—'}
            </Text>
            <Text style={styles.statLabel}>Cornering</Text>
          </View>
        </View>

        {/* Achievements */}
        {earned.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Achievements ({earned.length})</Text>
            <View style={styles.achievementGrid}>
              {earned.map(e => {
                const def = ACHIEVEMENTS.find(a => a.id === e.id);
                return (
                  <View key={e.id} style={styles.achievementItem}>
                    <Text style={styles.achievementItemIcon}>{def?.icon ?? '🏆'}</Text>
                    <Text style={styles.achievementItemTitle} numberOfLines={1}>
                      {def?.title ?? e.id}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Recent Rides — no GPS data, aggregate only */}
        {rides.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Rides</Text>
            {rides.map(ride => (
              <View key={ride.id} style={styles.rideRow}>
                <Text style={styles.rideDate}>{formatDate(ride.started_at)}</Text>
                <Text style={styles.rideStats}>
                  {formatDistance(ride.distance_m)} · {formatDuration(ride.duration_s)}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  scroll: { padding: 20, paddingBottom: 48 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#888888', fontSize: 16 },
  backBtn: { marginBottom: 20 },
  backText: { color: '#FF6B35', fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  avatarLetter: { fontSize: 26, fontWeight: '800' },
  headerInfo: { flex: 1, gap: 6 },
  username: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  levelBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },
  followBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
  },
  followBtnText: { color: '#000000', fontWeight: '700', fontSize: 14 },
  followingBtnText: { color: '#888888' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  statLabel: { color: '#666666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  achievementItem: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    width: 80,
    gap: 4,
  },
  achievementItemIcon: { fontSize: 28 },
  achievementItemTitle: {
    color: '#888888',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  rideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rideDate: { color: '#AAAAAA', fontSize: 14 },
  rideStats: { color: '#666666', fontSize: 13 },
});
