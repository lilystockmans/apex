import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSignUp() {
    if (!email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to {email}.{'\n'}
          Click it, then sign in to start syncing your rides.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth/sign-in')}>
          <Text style={styles.primaryBtnText}>Go to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Back up your rides and use Apex on multiple devices.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Min. 8 characters"
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#666"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignUp} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>Create account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth/sign-in')}>
          <Text style={styles.secondaryBtnText}>Already have an account? Sign in</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={() => router.replace('/(tabs)/record')}>
          <Text style={styles.skipBtnText}>Continue without account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F0F' },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#999', marginBottom: 32, textAlign: 'center' },
  checkmark: { fontSize: 64, marginBottom: 16 },
  label: { fontSize: 13, color: '#AAA', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#1C1C1E', color: '#FFF', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#333',
  },
  primaryBtn: {
    backgroundColor: '#F97316', borderRadius: 10, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
  },
  primaryBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { alignItems: 'center', marginTop: 20 },
  secondaryBtnText: { color: '#F97316', fontSize: 15 },
  skipBtn: { alignItems: 'center', marginTop: 16 },
  skipBtnText: { color: '#555', fontSize: 14 },
});
