import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { captureCalibration } from '../../lib/calibration';

type CalibState = 'idle' | 'capturing' | 'done';

export default function OnboardingStep2() {
  const [state, setState] = useState<CalibState>('idle');

  async function handleCalibrate() {
    setState('capturing');
    try {
      await captureCalibration();
      setState('done');
    } catch {
      setState('idle');
      Alert.alert('Calibration failed', 'Could not read sensor data. Try again.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 2 of 4</Text>
        <Text style={styles.heading}>Calibrate sensors</Text>

        <View style={styles.diagram}>
          <Text style={styles.diagramEmoji}>🏍️</Text>
          <Text style={styles.diagramCaption}>Mount phone on handlebar — upright, flat surface</Text>
        </View>

        <View style={styles.instructions}>
          <InstructionRow n={1} text="Mount your phone on the handlebar in portrait orientation." />
          <InstructionRow n={2} text="Sit on your bike on a flat surface and hold the bike upright." />
          <InstructionRow n={3} text="Keep the bike still, then tap Calibrate." />
        </View>

        <Text style={styles.note}>
          This captures the resting gravity vector so your scores reflect actual inputs, not phone angle.
        </Text>
      </View>

      <View style={styles.footer}>
        {state === 'done' ? (
          <TouchableOpacity style={[styles.button, styles.nextButton]} onPress={() => router.push('/onboarding/step-3')}>
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, state === 'capturing' && styles.buttonDisabled]}
            onPress={handleCalibrate}
            disabled={state === 'capturing'}
          >
            {state === 'capturing' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Calibrate</Text>
            )}
          </TouchableOpacity>
        )}

        {state === 'done' && (
          <Text style={styles.successText}>✓ Calibration saved</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function InstructionRow({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.instrRow}>
      <View style={styles.instrBadge}>
        <Text style={styles.instrN}>{n}</Text>
      </View>
      <Text style={styles.instrText}>{text}</Text>
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
    gap: 24,
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
  diagram: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    gap: 8,
  },
  diagramEmoji: {
    fontSize: 64,
  },
  diagramCaption: {
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  instructions: {
    gap: 16,
  },
  instrRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  instrBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instrN: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  instrText: {
    flex: 1,
    color: '#CCCCCC',
    fontSize: 15,
    lineHeight: 22,
  },
  note: {
    color: '#666666',
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    gap: 12,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 48,
    alignItems: 'center',
    width: '100%',
    minHeight: 56,
    justifyContent: 'center',
  },
  nextButton: {
    backgroundColor: '#2E7D32',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});
