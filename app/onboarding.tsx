import { Colors } from '@/constants/theme';
import { useProfile } from '@/context/ProfileContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: _screenWidth } = Dimensions.get('window');

const HEALTH_GOALS = [
  'Better Sleep', 'More Energy', 'Immune Support', 'Gut Health',
  'Stress Relief', 'Skin & Hair', 'Focus & Cognition', 'Hormonal Balance',
  'Joint & Bone Health', 'Muscle Recovery',
];

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

const TIME_PRESETS = [
  '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM',
  '11:00 PM', '11:30 PM',
];

const CAFFEINE_TYPES = ['Coffee', 'Green Tea', 'Black Tea', 'Matcha', 'Energy Drinks', 'Pre-Workout'];
const CAFFEINE_TIMES = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding, profile } = useProfile();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Local form state
  const [name, setName] = useState(profile.name || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [healthGoals, setHealthGoals] = useState<string[]>(profile.healthGoals || []);
  const [otherGoal, setOtherGoal] = useState(profile.otherGoal || '');
  const [wakeTime, setWakeTime] = useState(profile.wakeTime || '07:00 AM');
  const [sleepTime, setSleepTime] = useState(profile.sleepTime || '10:30 PM');
  const [breakfastTime, setBreakfastTime] = useState(profile.breakfastTime || '08:00 AM');
  const [lunchTime, setLunchTime] = useState(profile.lunchTime || '01:00 PM');
  const [dinnerTime, setDinnerTime] = useState(profile.dinnerTime || '07:00 PM');
  const [drinksCaffeine, setDrinksCaffeine] = useState(profile.drinksCaffeine || false);
  const [caffeineType, setCaffeineType] = useState<string[]>(profile.caffeineType || []);
  const [caffeineTimes, setCaffeineTimes] = useState<string[]>(profile.caffeineTimes || []);

  const animateTransition = (direction: 'next' | 'prev', callback: () => void) => {
    const exitTo = direction === 'next' ? -30 : 30;
    const enterFrom = direction === 'next' ? 30 : -30;

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: exitTo, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      callback();
      slideAnim.setValue(enterFrom);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      animateTransition('next', () => setStep(step + 1));
    } else {
      handleComplete();
    }
  };

  const goBack = () => {
    if (step > 0) {
      animateTransition('prev', () => setStep(step - 1));
    }
  };

  const handleComplete = async () => {
    await completeOnboarding({
      name, dob, gender, healthGoals, otherGoal,
      wakeTime, sleepTime, breakfastTime, lunchTime, dinnerTime,
      drinksCaffeine, caffeineType, caffeineTimes,
    });
    router.replace('/(tabs)/explore');
  };

  const toggleGoal = (goal: string) => {
    setHealthGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleCaffeineType = (type: string) => {
    setCaffeineType(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleCaffeineTime = (time: string) => {
    setCaffeineTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: return name.trim().length > 0;
      case 2: return gender.length > 0;
      case 3: return healthGoals.length > 0;
      case 4: return true; // Daily rhythm times always have defaults
      case 5: return true; // Caffeine is optional
      case 6: return true; // Review
      default: return true;
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i <= step && styles.progressDotActive,
            i === step && styles.progressDotCurrent,
          ]}
        />
      ))}
    </View>
  );

  const TimeSelector = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <View style={styles.timeSelectorContainer}>
      <Text style={styles.timeSelectorLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScrollView}>
        {TIME_PRESETS.map(time => (
          <TouchableOpacity
            key={time}
            style={[styles.timeChip, value === time && styles.timeChipActive]}
            onPress={() => onChange(time)}
          >
            <Text style={[styles.timeChipText, value === time && styles.timeChipTextActive]}>{time}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      // Step 0: Welcome
      case 0:
        return (
          <View style={styles.centeredStep}>
            <View style={styles.logoContainer}>
              <Ionicons name="sparkles" size={48} color={Colors.light.accent} />
            </View>
            <Text style={styles.welcomeTitle}>Stop Guessing.{'\n'}Start Gleaming.</Text>
            <Text style={styles.welcomeSubtitle}>
              Your personal supplement ritual companion. Let&apos;s set up your profile so we can optimise your daily protocols.
            </Text>
            <View style={styles.welcomeFeatures}>
              {[
                { icon: 'shield-checkmark', text: 'Clinical interaction checking' },
                { icon: 'time', text: 'Optimised timing protocols' },
                { icon: 'analytics', text: 'Adherence tracking & insights' },
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={f.icon as any} size={18} color={Colors.light.primary} />
                  </View>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      // Step 1: Name & DOB 
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>About You</Text>
            <Text style={styles.stepSubtitle}>We&apos;ll use this to personalise your supplement experience</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#B8BDB5"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Birth (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={dob}
                onChangeText={setDob}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#B8BDB5"
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.inputHint}>Age-specific recommendations for dosing</Text>
            </View>
          </View>
        );

      // Step 2: Gender
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Gender</Text>
            <Text style={styles.stepSubtitle}>Helps us tailor supplement recommendations to your biology</Text>

            <View style={styles.optionsGrid}>
              {GENDER_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionCard, gender === option && styles.optionCardActive]}
                  onPress={() => setGender(option)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionRadio, gender === option && styles.optionRadioActive]}>
                    {gender === option && <View style={styles.optionRadioDot} />}
                  </View>
                  <Text style={[styles.optionText, gender === option && styles.optionTextActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      // Step 3: Health Goals
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your Health Goals</Text>
            <Text style={styles.stepSubtitle}>Select all that apply — we&apos;ll prioritise your protocols accordingly</Text>

            <View style={styles.goalsGrid}>
              {HEALTH_GOALS.map(goal => (
                <TouchableOpacity
                  key={goal}
                  style={[styles.goalChip, healthGoals.includes(goal) && styles.goalChipActive]}
                  onPress={() => toggleGoal(goal)}
                  activeOpacity={0.7}
                >
                  {healthGoals.includes(goal) && (
                    <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.goalChipText, healthGoals.includes(goal) && styles.goalChipTextActive]}>{goal}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.inputGroup, { marginTop: 20 }]}>
              <Text style={styles.inputLabel}>Other (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={otherGoal}
                onChangeText={setOtherGoal}
                placeholder="Anything else you're working on?"
                placeholderTextColor="#B8BDB5"
              />
            </View>
          </View>
        );

      // Step 4: Daily Rhythm
      case 4:
        return (
          <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Your Daily Rhythm</Text>
            <Text style={styles.stepSubtitle}>Tell us about your typical day so we can time your supplements perfectly</Text>

            <TimeSelector label="☀️  Wake Time" value={wakeTime} onChange={setWakeTime} />
            <TimeSelector label="🥣  Breakfast" value={breakfastTime} onChange={setBreakfastTime} />
            <TimeSelector label="🥗  Lunch" value={lunchTime} onChange={setLunchTime} />
            <TimeSelector label="🍽️  Dinner" value={dinnerTime} onChange={setDinnerTime} />
            <TimeSelector label="🌙  Bedtime" value={sleepTime} onChange={setSleepTime} />

            <View style={styles.rhythmNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.light.primary} />
              <Text style={styles.rhythmNoteText}>
                We use these times to space your supplements optimally around meals and sleep for maximum absorption.
              </Text>
            </View>
          </ScrollView>
        );

      // Step 5: Caffeine
      case 5:
        return (
          <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Caffeine Intake</Text>
            <Text style={styles.stepSubtitle}>Caffeine can interact with certain supplements — let us know your habits</Text>

            <View style={styles.caffeineToggle}>
              <Text style={styles.caffeineToggleLabel}>Do you regularly drink caffeine?</Text>
              <View style={styles.caffeineToggleRow}>
                <TouchableOpacity
                  style={[styles.caffeineToggleBtn, drinksCaffeine && styles.caffeineToggleBtnActive]}
                  onPress={() => setDrinksCaffeine(true)}
                >
                  <Text style={[styles.caffeineToggleBtnText, drinksCaffeine && styles.caffeineToggleBtnTextActive]}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.caffeineToggleBtn, !drinksCaffeine && styles.caffeineToggleBtnActive]}
                  onPress={() => { setDrinksCaffeine(false); setCaffeineType([]); setCaffeineTimes([]); }}
                >
                  <Text style={[styles.caffeineToggleBtnText, !drinksCaffeine && styles.caffeineToggleBtnTextActive]}>No</Text>
                </TouchableOpacity>
              </View>
            </View>

            {drinksCaffeine && (
              <>
                <Text style={[styles.inputLabel, { marginTop: 24, marginBottom: 12 }]}>What type(s)?</Text>
                <View style={styles.goalsGrid}>
                  {CAFFEINE_TYPES.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.goalChip, caffeineType.includes(type) && styles.goalChipActive]}
                      onPress={() => toggleCaffeineType(type)}
                      activeOpacity={0.7}
                    >
                      {caffeineType.includes(type) && (
                        <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.goalChipText, caffeineType.includes(type) && styles.goalChipTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 24, marginBottom: 12 }]}>When do you usually have it?</Text>
                <View style={styles.goalsGrid}>
                  {CAFFEINE_TIMES.map(time => (
                    <TouchableOpacity
                      key={time}
                      style={[styles.goalChip, caffeineTimes.includes(time) && styles.goalChipActive]}
                      onPress={() => toggleCaffeineTime(time)}
                      activeOpacity={0.7}
                    >
                      {caffeineTimes.includes(time) && (
                        <Ionicons name="checkmark-circle" size={16} color={Colors.light.primary} style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.goalChipText, caffeineTimes.includes(time) && styles.goalChipTextActive]}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.rhythmNote, { marginTop: 16 }]}>
                  <Ionicons name="cafe" size={16} color="#A78B6C" />
                  <Text style={styles.rhythmNoteText}>
                    Caffeine can inhibit iron absorption and interact with certain minerals. We&apos;ll factor this into your timing protocols.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        );

      // Step 6: Review & Confirm
      case 6:
        return (
          <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Your Profile</Text>
            <Text style={styles.stepSubtitle}>Review your details before we build your protocols</Text>

            <View style={styles.reviewCard}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Name</Text>
                <Text style={styles.reviewValue}>{name || '—'}</Text>
              </View>
              {dob ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Date of Birth</Text>
                  <Text style={styles.reviewValue}>{dob}</Text>
                </View>
              ) : null}
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Gender</Text>
                <Text style={styles.reviewValue}>{gender || '—'}</Text>
              </View>
              <View style={[styles.reviewRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={styles.reviewLabel}>Health Goals</Text>
                <View style={[styles.goalsGrid, { marginTop: 8 }]}>
                  {healthGoals.map(g => (
                    <View key={g} style={[styles.goalChip, styles.goalChipActive, { paddingVertical: 6 }]}>
                      <Text style={[styles.goalChipText, styles.goalChipTextActive, { fontSize: 12 }]}>{g}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>Daily Rhythm</Text>
              {[
                { label: 'Wake', value: wakeTime, icon: '☀️' },
                { label: 'Breakfast', value: breakfastTime, icon: '🥣' },
                { label: 'Lunch', value: lunchTime, icon: '🥗' },
                { label: 'Dinner', value: dinnerTime, icon: '🍽️' },
                { label: 'Bedtime', value: sleepTime, icon: '🌙' },
              ].map(item => (
                <View key={item.label} style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>{item.icon}  {item.label}</Text>
                  <Text style={styles.reviewValue}>{item.value}</Text>
                </View>
              ))}
            </View>

            {drinksCaffeine && caffeineType.length > 0 && (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewSectionTitle}>Caffeine</Text>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Types</Text>
                  <Text style={styles.reviewValue}>{caffeineType.join(', ')}</Text>
                </View>
                {caffeineTimes.length > 0 && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Times</Text>
                    <Text style={styles.reviewValue}>{caffeineTimes.join(', ')}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.rhythmNote, { marginBottom: 40 }]}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.light.primary} />
              <Text style={styles.rhythmNoteText}>
                You can always edit these settings later from your Profile tab.
              </Text>
            </View>
          </ScrollView>
        );

      default:
        return null;
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
        {/* Header with progress */}
        {step > 0 && (
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={Colors.light.primary} />
            </TouchableOpacity>
            {renderProgressBar()}
            <View style={styles.backButton} />
          </View>
        )}

        {/* Step Content */}
        <Animated.View
          style={[
            styles.flex,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {renderStep()}
        </Animated.View>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !canProceed() && styles.continueButtonDisabled]}
            onPress={goNext}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {step === 0 ? "Let's Begin" : step === TOTAL_STEPS - 1 ? 'Start My Rituals' : 'Continue'}
            </Text>
            <Ionicons
              name={step === TOTAL_STEPS - 1 ? 'sparkles' : 'arrow-forward'}
              size={18}
              color="#FFFFFF"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
          {step === 0 && (
            <Text style={styles.privacyText}>By continuing you agree to our Privacy Policy</Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Progress
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  progressDot: { height: 4, borderRadius: 2, backgroundColor: '#E8E6DF', width: 20 },
  progressDotActive: { backgroundColor: Colors.light.primary },
  progressDotCurrent: { width: 32, backgroundColor: Colors.light.primary },

  // Step containers
  centeredStep: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  stepContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },

  // Welcome step
  logoContainer: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(216, 184, 136, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 32,
  },
  welcomeTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 36, color: Colors.light.text, marginBottom: 12, textAlign: 'center' },
  welcomeSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: Colors.light.icon, textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  welcomeFeatures: { width: '100%', gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(138, 154, 131, 0.12)', alignItems: 'center', justifyContent: 'center',
  },
  featureText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: Colors.light.text, flex: 1 },

  // Step titles
  stepTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: Colors.light.text, marginBottom: 8 },
  stepSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.light.icon, lineHeight: 21, marginBottom: 28 },

  // Inputs
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.light.text, marginBottom: 8, letterSpacing: 0.3 },
  textInput: {
    fontFamily: 'Inter_400Regular', fontSize: 16, color: Colors.light.text,
    backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1.5, borderColor: '#E8E6DF',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  inputHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#B8BDB5', marginTop: 6 },

  // Gender options
  optionsGrid: { gap: 12 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderColor: '#E8E6DF',
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
  },
  optionCardActive: { borderColor: Colors.light.primary, backgroundColor: 'rgba(138, 154, 131, 0.08)' },
  optionRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  optionRadioActive: { borderColor: Colors.light.primary },
  optionRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.primary },
  optionText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: Colors.light.text },
  optionTextActive: { color: Colors.light.primary },

  // Health Goals
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1.5, borderColor: '#E8E6DF', borderRadius: 24,
  },
  goalChipActive: { borderColor: Colors.light.primary, backgroundColor: 'rgba(138, 154, 131, 0.1)' },
  goalChipText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6B7566' },
  goalChipTextActive: { color: Colors.light.primary },

  // Time selectors
  timeSelectorContainer: { marginBottom: 20 },
  timeSelectorLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.light.text, marginBottom: 10 },
  timeScrollView: { flexGrow: 0 },
  timeChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#E8E6DF',
    borderRadius: 10, marginRight: 8,
  },
  timeChipActive: { borderColor: Colors.light.primary, backgroundColor: 'rgba(138, 154, 131, 0.15)' },
  timeChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#8A9A83' },
  timeChipTextActive: { color: Colors.light.primary, fontFamily: 'Inter_600SemiBold' },

  rhythmNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(138, 154, 131, 0.08)', borderRadius: 12, padding: 14, marginTop: 12,
  },
  rhythmNoteText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.light.icon, flex: 1, lineHeight: 19 },

  // Caffeine toggle
  caffeineToggle: { marginBottom: 8 },
  caffeineToggleLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.light.text, marginBottom: 12 },
  caffeineToggleRow: { flexDirection: 'row', gap: 12 },
  caffeineToggleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1.5, borderColor: '#E8E6DF',
    alignItems: 'center',
  },
  caffeineToggleBtnActive: { borderColor: Colors.light.primary, backgroundColor: 'rgba(138, 154, 131, 0.1)' },
  caffeineToggleBtnText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#8A9A83' },
  caffeineToggleBtnTextActive: { color: Colors.light.primary, fontFamily: 'Inter_600SemiBold' },

  // Review
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#E8E6DF',
    borderRadius: 16, padding: 18, marginBottom: 16,
  },
  reviewSectionTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 16, color: Colors.light.primary, marginBottom: 14 },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0EBE1',
  },
  reviewLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.light.icon },
  reviewValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.light.text, textAlign: 'right', flexShrink: 1 },

  // Bottom
  bottomContainer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 12 },
  continueButton: {
    backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.light.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12,
  },
  continueButtonDisabled: { opacity: 0.4 },
  continueButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' },
  privacyText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#B8BDB5', textAlign: 'center', marginTop: 14 },
});
