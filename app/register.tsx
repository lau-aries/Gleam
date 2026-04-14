import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Animations
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/operation-not-allowed':
        return 'Email/password registration is not enabled.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const getPasswordStrength = (pw: string): { label: string; color: string; width: number } => {
    if (pw.length === 0) return { label: '', color: 'transparent', width: 0 };
    if (pw.length < 6) return { label: 'Too short', color: '#D94F4F', width: 20 };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: '#E8A838', width: 40 };
    if (score <= 2) return { label: 'Fair', color: '#D8B888', width: 60 };
    if (score <= 3) return { label: 'Good', color: '#8A9A83', width: 80 };
    return { label: 'Strong', color: '#5A7A53', width: 100 };
  };

  const handleRegister = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      shake();
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      shake();
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      shake();
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password);
      // New user → go straight to onboarding
      router.replace('/onboarding');
    } catch (err: any) {
      const errorCode = err?.code || '';
      setError(getErrorMessage(errorCode));
      shake();
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);
  const canSubmit = email.trim().length > 0 && password.length >= 6 && confirmPassword.length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.light.background, '#FFFFFF', Colors.light.background]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header */}
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.light.primary} />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="person-add" size={32} color={Colors.light.accent} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Start your personalised supplement journey
            </Text>

            {/* Error */}
            {error ? (
              <Animated.View style={[styles.errorContainer, { transform: [{ translateX: shakeAnim }] }]}>
                <Ionicons name="alert-circle" size={18} color="#D94F4F" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(text) => { setEmail(text); setError(''); }}
                  placeholder="yourname@email.com"
                  placeholderTextColor="#B8BDB5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { flex: 1, paddingRight: 48 }]}
                  value={password}
                  onChangeText={(text) => { setPassword(text); setError(''); }}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#B8BDB5"
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.light.icon}
                  />
                </TouchableOpacity>
              </View>
              {/* Password strength bar */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        { width: `${strength.width}%`, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[
                styles.inputWrapper,
                confirmPassword.length > 0 && password !== confirmPassword && styles.inputWrapperError,
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.light.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { flex: 1, paddingRight: 48 }]}
                  value={confirmPassword}
                  onChangeText={(text) => { setConfirmPassword(text); setError(''); }}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#B8BDB5"
                  secureTextEntry={!showConfirm}
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.light.icon}
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && password === confirmPassword && (
                <View style={styles.matchRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#5A7A53" />
                  <Text style={styles.matchText}>Passwords match</Text>
                </View>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
              onPress={handleRegister}
              disabled={!canSubmit || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Note */}
            <View style={styles.noteContainer}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.light.primary} />
              <Text style={styles.noteText}>
                Your data is encrypted and stored securely. We never share your information.
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>already have an account?</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Go to Login */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  content: { width: '100%' },

  // Back
  backButton: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, marginLeft: -8,
  },

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(216, 184, 136, 0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Title
  title: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: Colors.light.text,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.light.icon,
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  // Error
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(217, 79, 79, 0.08)', borderWidth: 1, borderColor: 'rgba(217, 79, 79, 0.2)',
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#D94F4F', flex: 1, lineHeight: 19 },

  // Input
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.light.text,
    marginBottom: 8, letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1.5, borderColor: '#E8E6DF',
    borderRadius: 14, overflow: 'hidden',
  },
  inputWrapperError: { borderColor: 'rgba(217, 79, 79, 0.4)' },
  inputIcon: { marginLeft: 16 },
  textInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: Colors.light.text,
    paddingHorizontal: 12, paddingVertical: 15,
  },
  eyeButton: { position: 'absolute', right: 16, padding: 4 },

  // Password strength
  strengthContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8,
  },
  strengthBarBg: {
    flex: 1, height: 4, backgroundColor: '#E8E6DF', borderRadius: 2, overflow: 'hidden',
  },
  strengthBarFill: { height: 4, borderRadius: 2 },
  strengthLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, minWidth: 55 },

  // Match indicator
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  matchText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#5A7A53' },

  // Primary Button
  primaryButton: {
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },

  // Note
  noteContainer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(138, 154, 131, 0.08)', borderRadius: 12,
    padding: 13, marginTop: 16,
  },
  noteText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.light.icon, flex: 1, lineHeight: 18 },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8E6DF' },
  dividerText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#B8BDB5', marginHorizontal: 12 },

  // Secondary Button
  secondaryButton: {
    borderWidth: 1.5, borderColor: Colors.light.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    backgroundColor: 'rgba(138, 154, 131, 0.06)',
  },
  secondaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.light.primary },
});
