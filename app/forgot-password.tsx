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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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

  const handleReset = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      shake();
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      shake();
    } finally {
      setLoading(false);
    }
  };

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
            {/* Back */}
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.light.primary} />
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={sent ? 'checkmark-circle' : 'key-outline'}
                  size={36}
                  color={sent ? '#5A7A53' : Colors.light.accent}
                />
              </View>
            </View>

            {sent ? (
              <>
                <Text style={styles.title}>Check Your Inbox</Text>
                <Text style={styles.subtitle}>
                  We&apos;ve sent a password reset link to{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>

                <View style={styles.noteContainer}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.light.primary} />
                  <Text style={styles.noteText}>
                    Didn&apos;t receive the email? Check your spam folder, or try again in a few minutes.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.replace('/login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Back to Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => { setSent(false); setEmail(''); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendText}>Try a different email</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email and we&apos;ll send you a link to reset your password.
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
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, !email.trim() && styles.primaryButtonDisabled]}
                  onPress={handleReset}
                  disabled={!email.trim() || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                      <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backToLogin}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={16} color={Colors.light.primary} />
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}
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

  // Icon
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38,
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
  emailHighlight: {
    fontFamily: 'Inter_600SemiBold', color: Colors.light.text,
  },

  // Error
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(217, 79, 79, 0.08)', borderWidth: 1, borderColor: 'rgba(217, 79, 79, 0.2)',
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#D94F4F', flex: 1, lineHeight: 19 },

  // Input
  inputGroup: { marginBottom: 24 },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.light.text,
    marginBottom: 8, letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1.5, borderColor: '#E8E6DF',
    borderRadius: 14, overflow: 'hidden',
  },
  inputIcon: { marginLeft: 16 },
  textInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: Colors.light.text,
    paddingHorizontal: 12, paddingVertical: 15,
  },

  // Note
  noteContainer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(138, 154, 131, 0.08)', borderRadius: 12,
    padding: 14, marginBottom: 24,
  },
  noteText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.light.icon, flex: 1, lineHeight: 19 },

  // Primary Button
  primaryButton: {
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },

  // Resend
  resendButton: { alignSelf: 'center', marginTop: 20 },
  resendText: {
    fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.light.primary,
    textDecorationLine: 'underline',
  },

  // Back to login
  backToLogin: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 20,
  },
  backToLoginText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.light.primary },
});
