import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', error.message);
    } else {
      router.replace('/(tabs)/record');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to sync your rides across devices.</Text>

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
          placeholder="••••••••"
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity onPress={() => router.push('/auth/sign-in-forgot')} style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryBtnText}>Sign in</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth/sign-up')}>
          <Text style={styles.secondaryBtnText}>Don't have an account? Sign up</Text>
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
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#999', marginBottom: 32 },
  label: { fontSize: 13, color: '#AAA', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#1C1C1E', color: '#FFF', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    borderWidth: 1, borderColor: '#333',
  },
  forgotWrap: { alignSelf: 'flex-end', marginTop: 8 },
  forgotText: { color: '#F97316', fontSize: 14 },
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
