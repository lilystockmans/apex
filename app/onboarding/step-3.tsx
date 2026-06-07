import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function OnboardingStep3() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepLabel}>Step 3 of 4</Text>
        <Text style={styles.heading}>How your scores work</Text>
        <Text style={styles.body}>
          Apex analyses your riding behaviour — not the road, not your speed. Progress is measured
          against your own baseline, so a beginner and an expert can both improve.
        </Text>

        <View style={styles.metrics}>
          <MetricCard
            emoji="🛑"
            name="Braking"
            description="Smooth, progressive braking scores high. Grabbing the lever scores low. Measured by the rate of change in deceleration."
          />
          <MetricCard
            emoji="🔄"
            name="Throttle"
            description="Rolling on and off smoothly is the goal. Choppy inputs — especially on corner exit — cost you points."
          />
          <MetricCard
            emoji="↩️"
            name="Cornering"
            description="Consistent lean angle changes and left/right balance show up here. Improves as you build muscle memory."
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Scores appear after 3 rides</Text>
          <Text style={styles.infoBody}>
            Your first three rides establish a baseline. After that, every ride updates your rolling
            average. One bad day barely moves the needle.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding/step-4')}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function MetricCard({
  emoji,
  name,
  description,
}: {
  emoji: string;
  name: string;
  description: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <View style={styles.cardText}>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
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
    paddingHorizontal: 28,
    paddingTop: 48,
    gap: 24,
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
  metrics: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#888888',
    fontSize: 14,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#1A2A1A',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    gap: 6,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBody: {
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
