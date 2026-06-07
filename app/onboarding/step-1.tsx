import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export default function OnboardingStep1() {
  const [requesting, setRequesting] = useState(false);

  async function handleRequestPermissions() {
    setRequesting(true);
    try {
      const { status: fg } = await Location.requestForegroundPermissionsAsync();
      if (fg !== 'granted') {
        Alert.alert(
          'Location required',
          'Apex needs location access to record your rides. Please grant permission in Settings.'
        );
        setRequesting(false);
        return;
      }

      const { status: bg } = await Location.requestBackgroundPermissionsAsync();
      if (bg !== 'granted') {
        Alert.alert(
          'Background location required',
          'Apex needs "Allow all the time" location access so recording continues when your screen is off.'
        );
        setRequesting(false);
        return;
      }

      await Notifications.requestPermissionsAsync();

      router.push('/onboarding/step-2');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 1 of 4</Text>
        <Text style={styles.heading}>Welcome to Apex</Text>
        <Text style={styles.body}>
          Apex turns every ride into a coaching session — scoring your braking smoothness, throttle
          control, and cornering balance using your phone's sensors.
        </Text>

        <View style={styles.permissionList}>
          <PermissionRow
            icon="📍"
            title="Location (always)"
            description="Records your route and speed. Background access keeps recording going when your screen locks."
          />
          <PermissionRow
            icon="🔔"
            title="Notifications"
            description="Shows a persistent notification while recording, and alerts you to weekly score updates."
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, requesting && styles.buttonDisabled]}
          onPress={handleRequestPermissions}
          disabled={requesting}
        >
          <Text style={styles.buttonText}>
            {requesting ? 'Requesting…' : 'Grant permissions'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PermissionRow({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.permRow}>
      <Text style={styles.permIcon}>{icon}</Text>
      <View style={styles.permText}>
        <Text style={styles.permTitle}>{title}</Text>
        <Text style={styles.permDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    gap: 20,
  },
  stepLabel: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  body: {
    color: '#AAAAAA',
    fontSize: 16,
    lineHeight: 24,
  },
  permissionList: {
    marginTop: 12,
    gap: 20,
  },
  permRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  permIcon: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  permText: {
    flex: 1,
    gap: 4,
  },
  permTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  permDesc: {
    color: '#888888',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 48,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
