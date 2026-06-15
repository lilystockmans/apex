import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Please enter the email address for your account.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={[styles.root, styles.centerContent]}>
        <Text style={styles.checkmark}>✉️</Text>
        <Text style={styles.title}>Email sent</Text>
        <Text style={styles.subtitle}>
          Check {email} for a link to reset your password.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/auth/sign-in')}>
          <Text style={styles.primaryBtnText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send a reset link.
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

        <TouchableOpacity style={styles.primaryBtn} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>Send reset link</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F0F0F' },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 24 },
  backText: { color: '#F97316', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#999', marginBottom: 32, textAlign: 'center' },
  checkmark: { fontSize: 48, marginBottom: 16 },
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
});
