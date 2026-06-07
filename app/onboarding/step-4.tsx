import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { kvSet } from '../../lib/storage';

export default function OnboardingStep4() {
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);

  function handleAgree() {
    kvSet('onboarding_complete', 'true');
    kvSet('gdpr_consent_at', String(Date.now()));
    setDone(true);
  }

  if (done) {
    return <Redirect href="/(tabs)/record" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepLabel}>Step 4 of 4</Text>
        <Text style={styles.heading}>Privacy & data</Text>

        <Text style={styles.body}>
          Before you start riding, please read how Apex handles your data.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What we collect</Text>
          <BulletRow text="GPS location and speed during rides" />
          <BulletRow text="Accelerometer and gyroscope readings" />
          <BulletRow text="Ride timestamps and distance" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What we don't do</Text>
          <BulletRow text="Your data is stored on your device only (Phases 1–3)" />
          <BulletRow text="We never sell your location data" />
          <BulletRow text="No speed leaderboards or comparisons with other riders" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your rights (GDPR)</Text>
          <BulletRow text="You can delete all your data at any time from Settings" />
          <BulletRow text="If cloud sync is added (Phase 4+), you'll be asked again before any data leaves your device" />
        </View>

        <TouchableOpacity onPress={() => Linking.openURL('https://apex-moto.app/privacy')}>
          <Text style={styles.privacyLink}>Read the full Privacy Policy →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.checkbox, agreed && styles.checkboxChecked]}
          onPress={() => setAgreed((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkMark, agreed && styles.checkMarkVisible]}>
            <Text style={styles.checkMarkText}>✓</Text>
          </View>
          <Text style={styles.checkboxLabel}>
            I understand how Apex uses my data and agree to the Privacy Policy.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !agreed && styles.buttonDisabled]}
          onPress={handleAgree}
          disabled={!agreed}
        >
          <Text style={styles.buttonText}>Start riding</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 48,
    gap: 20,
    paddingBottom: 16,
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
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bullet: {
    color: '#FF6B35',
    fontSize: 15,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 22,
  },
  privacyLink: {
    color: '#FF6B35',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  checkbox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#333333',
  },
  checkboxChecked: {
    borderColor: '#FF6B35',
  },
  checkMark: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkMarkVisible: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    color: '#CCCCCC',
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
    opacity: 0.4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
