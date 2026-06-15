import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { syncWithRetry } from '../../lib/sync';
import { kvGet } from '../../lib/storage';
import type { Session } from '@supabase/supabase-js';

export default function ProfileScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    loadLastSync();
    return () => listener.subscription.unsubscribe();
  }, []);

  function loadLastSync() {
    const ts = kvGet('last_sync_ts');
    setLastSyncTs(ts ? parseInt(ts) : null);
  }

  async function handleSyncNow() {
    setSyncing(true);
    await syncWithRetry();
    setSyncing(false);
    loadLastSync();
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Sign out of your account? Your local rides stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This will permanently delete all your synced ride data from the cloud. Local data on this device is preserved. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!session) return;
            // Delete profile row — CASCADE removes all rides and ride_points in Supabase
            const { error } = await supabase
              .from('profiles')
              .delete()
              .eq('id', session.user.id);
            if (error) {
              Alert.alert('Error', 'Could not delete account data: ' + error.message);
              return;
            }
            await supabase.auth.signOut();
            Alert.alert('Deleted', 'Your cloud data has been removed. Local rides are still on this device.');
          },
        },
      ]
    );
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncWithRetry();
    loadLastSync();
    setRefreshing(false);
  }, []);

  function formatSyncTime(ts: number): string {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        session
          ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
          : undefined
      }
    >
      <Text style={styles.title}>Profile</Text>

      {session ? (
        <>
          {/* Account info */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>ACCOUNT</Text>
            <Text style={styles.email}>{session.user.email}</Text>
            <Text style={styles.meta}>
              Member since {new Date(session.user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* Sync status */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SYNC</Text>
            <Text style={styles.syncStatus}>
              {lastSyncTs ? `Last synced: ${formatSyncTime(lastSyncTs)}` : 'Never synced'}
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, syncing && styles.actionBtnDisabled]}
              onPress={handleSyncNow}
              disabled={syncing}
            >
              {syncing
                ? <ActivityIndicator color="#F97316" size="small" />
                : <Text style={styles.actionBtnText}>Sync now</Text>}
            </TouchableOpacity>
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.outlineBtn} onPress={handleSignOut}>
            <Text style={styles.outlineBtnText}>Sign out</Text>
          </TouchableOpacity>

          {/* Danger zone */}
          <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
            <Text style={styles.dangerBtnText}>Delete account & cloud data</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Not signed in */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>CLOUD SYNC</Text>
            <Text style={styles.upsellText}>
              Create a free account to back up your rides and use Apex on multiple devices.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/auth/sign-up')}
          >
            <Text style={styles.primaryBtnText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/auth/sign-in')}
          >
            <Text style={styles.secondaryBtnText}>Sign in</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F0F' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF', marginBottom: 24 },
  card: {
    backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#2C2C2E',
  },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#666', letterSpacing: 1, marginBottom: 8 },
  email: { fontSize: 17, color: '#FFF', fontWeight: '500', marginBottom: 4 },
  meta: { fontSize: 13, color: '#666' },
  syncStatus: { fontSize: 15, color: '#AAA', marginBottom: 12 },
  actionBtn: {
    backgroundColor: '#2C2C2E', borderRadius: 8, paddingVertical: 10,
    paddingHorizontal: 16, alignSelf: 'flex-start', minWidth: 100, alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#F97316', fontWeight: '600', fontSize: 14 },
  primaryBtn: {
    backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1, borderColor: '#F97316', borderRadius: 10,
    paddingVertical: 16, alignItems: 'center', marginBottom: 24,
  },
  secondaryBtnText: { color: '#F97316', fontWeight: '600', fontSize: 16 },
  upsellText: { fontSize: 15, color: '#AAA', lineHeight: 22 },
  outlineBtn: {
    borderWidth: 1, borderColor: '#444', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  outlineBtnText: { color: '#CCC', fontSize: 15 },
  dangerBtn: {
    borderWidth: 1, borderColor: '#7F1D1D', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  dangerBtnText: { color: '#EF4444', fontSize: 14 },
});
