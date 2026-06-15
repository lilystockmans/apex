import '../lib/recording-task'; // registers APEX_RIDE_RECORDING task at module load
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { initDb } from '../lib/storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Fonts added here in Phase 1 when design is established
  });

  useEffect(() => {
    if (fontsLoaded) {
      initDb();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="ride/[id]" />
      </Stack>
    </GestureHandlerRootView>
  );
}
