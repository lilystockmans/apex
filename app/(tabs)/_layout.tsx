import { useEffect, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { kvGet } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function TabsLayout() {
  // undefined = still loading auth state; null = not signed in; Session = signed in
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Wait for Supabase session load before rendering (SQLite-backed, so near-instant)
  if (session === undefined) return null;

  // Onboarding takes priority over auth — users must set up the app before anything else
  if (!kvGet('onboarding_complete')) return <Redirect href="/onboarding/step-1" />;

  // Auth is optional — users can use the app fully local and sign in later via Profile tab
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      <Tabs.Screen name="history" options={{ title: 'Rides' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
