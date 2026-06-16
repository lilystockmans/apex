import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedItemType = 'ride' | 'achievement';

interface FeedItem {
  key: string;
  type: FeedItemType;
  ts: number;
  userId: string;
  username: string;
  level: string;
  // ride fields
  distanceKm?: number;
  durationMin?: number;
  // achievement fields
  achievementTitle?: string;
  achievementIcon?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

// ─── Feed Item ────────────────────────────────────────────────────────────────

function RideFeedItem({ item }: { item: FeedItem }) {
  return (
    <TouchableOpacity
      style={styles.feedCard}
      activeOpacity={0.75}
      onPress={() => router.push(`/profile/${item.userId}`)}
    >
      <View style={styles.feedCardRow}>
        <View style={[styles.levelDot, { backgroundColor: levelColor(item.level) }]} />
        <View style={styles.feedCardBody}>
          <Text style={styles.feedUsername}>{item.username}</Text>
          <Text style={styles.feedDetail}>
            rode {item.distanceKm?.toFixed(1)}km · {formatDuration(item.durationMin ?? 0)}
          </Text>
        </View>
        <Text style={styles.feedTime}>{timeAgo(item.ts)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function AchievementFeedItem({ item }: { item: FeedItem }) {
  return (
    <TouchableOpacity
      style={[styles.feedCard, styles.achievementCard]}
      activeOpacity={0.75}
      onPress={() => router.push(`/profile/${item.userId}`)}
    >
      <View style={styles.feedCardRow}>
        <Text style={styles.achievementIcon}>{item.achievementIcon ?? '🏆'}</Text>
        <View style={styles.feedCardBody}>
          <Text style={styles.feedUsername}>{item.username}</Text>
          <Text style={styles.feedDetail}>earned "{item.achievementTitle}"</Text>
        </View>
        <Text style={styles.feedTime}>{timeAgo(item.ts)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyFeed({ onFindRiders }: { onFindRiders: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🏍️</Text>
      <Text style={styles.emptyTitle}>No activity yet</Text>
      <Text style={styles.emptyBody}>
        Follow other riders to see their rides and achievements here.
      </Text>
      <TouchableOpacity style={styles.findBtn} onPress={onFindRiders}>
        <Text style={styles.findBtnText}>Find riders</Text>
      </TouchableOpacity>
    </View>
  );
}

function SignInPrompt() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>👤</Text>
      <Text style={styles.emptyTitle}>Sign in to see the feed</Text>
      <Text style={styles.emptyBody}>
        Create a free account to follow other riders and share your progress.
      </Text>
      <TouchableOpacity style={styles.findBtn} onPress={() => router.push('/auth/sign-in')}>
        <Text style={styles.findBtnText}>Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session) loadFeed(data.session.user.id);
        else setLoading(false);
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        if (s) loadFeed(s.user.id);
        else { setItems([]); setLoading(false); }
      });
      return () => listener.subscription.unsubscribe();
    }, [])
  );

  async function loadFeed(userId: string) {
    setLoading(true);
    try {
      // 1. Get list of followed user IDs
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      const followingIds = (follows ?? []).map((f: { following_id: string }) => f.following_id);

      if (followingIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 2. Fetch recent rides from followed users
      const { data: rides } = await supabase
        .from('rides')
        .select('id, user_id, started_at, distance_m, duration_s, profiles(username, current_level)')
        .in('user_id', followingIds)
        .order('started_at', { ascending: false })
        .limit(20);

      // 3. Fetch recent achievements from followed users
      const { data: achs } = await supabase
        .from('achievements')
        .select('id, user_id, earned_at, profiles(username, current_level)')
        .in('user_id', followingIds)
        .order('earned_at', { ascending: false })
        .limit(20);

      const rideItems: FeedItem[] = (rides ?? []).map((r: any) => ({
        key: `ride-${r.id}`,
        type: 'ride' as const,
        ts: new Date(r.started_at).getTime(),
        userId: r.user_id,
        username: r.profiles?.username ?? 'Rider',
        level: r.profiles?.current_level ?? 'novice',
        distanceKm: (r.distance_m ?? 0) / 1000,
        durationMin: (r.duration_s ?? 0) / 60,
      }));

      const achItems: FeedItem[] = (achs ?? []).map((a: any) => ({
        key: `ach-${a.id}-${a.user_id}`,
        type: 'achievement' as const,
        ts: new Date(a.earned_at).getTime(),
        userId: a.user_id,
        username: a.profiles?.username ?? 'Rider',
        level: a.profiles?.current_level ?? 'novice',
        achievementTitle: a.id.replace(/-/g, ' '),
        achievementIcon: '🏆',
      }));

      const merged = [...rideItems, ...achItems].sort((a, b) => b.ts - a.ts).slice(0, 30);
      setItems(merged);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!session) return;
    setRefreshing(true);
    await loadFeed(session.user.id);
    setRefreshing(false);
  }

  if (!session) return <SafeAreaView style={styles.container}><SignInPrompt /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Feed</Text>
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#FF6B35" size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.key}
          contentContainerStyle={items.length === 0 ? { flex: 1 } : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B35" />
          }
          ListEmptyComponent={
            <EmptyFeed onFindRiders={() => router.push('/profile/search')} />
          }
          renderItem={({ item }) =>
            item.type === 'ride'
              ? <RideFeedItem item={item} />
              : <AchievementFeedItem item={item} />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 48 },
  feedCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  achievementCard: {
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  feedCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  feedCardBody: { flex: 1 },
  feedUsername: { color: '#FFFFFF', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  feedDetail: { color: '#888888', fontSize: 13 },
  feedTime: { color: '#555555', fontSize: 12 },
  achievementIcon: { fontSize: 22 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  emptyBody: { color: '#888888', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  findBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  findBtnText: { color: '#000000', fontWeight: '700', fontSize: 15 },
});
