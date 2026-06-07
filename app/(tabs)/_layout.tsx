import { Redirect, Tabs } from 'expo-router';
import { kvGet } from '../../lib/storage';

export default function TabsLayout() {
  const done = kvGet('onboarding_complete');
  if (!done) return <Redirect href="/onboarding/step-1" />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      <Tabs.Screen name="history" options={{ title: 'Rides' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
