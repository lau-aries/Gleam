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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      shake();
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      shake();
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      // Returning user → go to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      const errorCode = err?.code || '';
      setError(getErrorMessage(errorCode));
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const canSubmit = email.trim().length > 0 && password.length > 0;

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
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="sparkles" size={36} color={Colors.light.accent} />
              </View>
              <Text style={styles.logoText}>Gleam</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your supplement rituals</Text>

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
                  placeholder="Enter your password"
                  placeholderTextColor="#B8BDB5"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
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
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Go to Register */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/register')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Create an Account</Text>
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

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(216, 184, 136, 0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoText: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: Colors.light.text,
    letterSpacing: 1,
  },

  // Title
  title: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, color: Colors.light.text,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.light.icon,
    textAlign: 'center', lineHeight: 22, marginBottom: 32,
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
  inputIcon: { marginLeft: 16 },
  textInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: Colors.light.text,
    paddingHorizontal: 12, paddingVertical: 15,
  },
  eyeButton: { position: 'absolute', right: 16, padding: 4 },

  // Forgot
  forgotButton: { alignSelf: 'flex-end', marginBottom: 28, marginTop: -4 },
  forgotText: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.light.primary,
    textDecorationLine: 'underline',
  },

  // Primary Button
  primaryButton: {
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8E6DF' },
  dividerText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#B8BDB5', marginHorizontal: 16 },

  // Secondary Button
  secondaryButton: {
    borderWidth: 1.5, borderColor: Colors.light.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    backgroundColor: 'rgba(138, 154, 131, 0.06)',
  },
  secondaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: Colors.light.primary },
});
