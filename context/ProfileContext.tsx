import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getGleamDb } from '@/services/firebaseConfig';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

type ProfileInfo = {
  name: string;
  dob: string;
  gender: string;
  healthGoals: string[];
  otherGoal: string;
  wakeTime?: string;
  sleepTime?: string;
  breakfastTime?: string;
  lunchTime?: string;
  dinnerTime?: string;
  drinksCaffeine?: boolean;
  caffeineType?: string[];
  caffeineTimes?: string[];
  marketingEmails?: boolean;
  pushNotifications?: boolean;
};

const DEFAULT_PROFILE: ProfileInfo = {
  name: '',
  dob: '',
  gender: '',
  healthGoals: [],
  otherGoal: '',
  wakeTime: '07:00 AM',
  sleepTime: '10:30 PM',
  breakfastTime: '08:00 AM',
  lunchTime: '01:00 PM',
  dinnerTime: '07:00 PM',
  drinksCaffeine: false,
  caffeineType: [],
  caffeineTimes: [],
  marketingEmails: false,
  pushNotifications: false,
};

interface ProfileContextType {
  profile: ProfileInfo;
  hasOnboarded: boolean;
  profileLoading: boolean;
  updateProfile: (updates: Partial<ProfileInfo>) => void;
  completeOnboarding: (profileData: Partial<ProfileInfo>) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  clearProfileData: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileInfo>(DEFAULT_PROFILE);

  // ── Load profile from Firestore when user changes ──────────────────
  useEffect(() => {
    if (!user) {
      // User logged out → reset local state
      setProfile(DEFAULT_PROFILE);
      setHasOnboarded(false);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);
      try {
        const db = getGleamDb();
        const snap = await getDoc(doc(db, 'users', user.uid));

        if (!cancelled && snap.exists()) {
          const data = snap.data();
          setProfile({
            name: data.name ?? '',
            dob: data.dob ?? '',
            gender: data.gender ?? '',
            healthGoals: data.healthGoals ?? [],
            otherGoal: data.otherGoal ?? '',
            wakeTime: data.wakeTime ?? '07:00 AM',
            sleepTime: data.sleepTime ?? '10:30 PM',
            breakfastTime: data.breakfastTime ?? '08:00 AM',
            lunchTime: data.lunchTime ?? '01:00 PM',
            dinnerTime: data.dinnerTime ?? '07:00 PM',
            drinksCaffeine: data.drinksCaffeine ?? false,
            caffeineType: data.caffeineType ?? [],
            caffeineTimes: data.caffeineTimes ?? [],
            marketingEmails: data.marketingEmails ?? false,
            pushNotifications: data.pushNotifications ?? false,
          });
          setHasOnboarded(data.hasOnboarded === true);
        } else if (!cancelled) {
          // New user, no doc yet
          setProfile(DEFAULT_PROFILE);
          setHasOnboarded(false);
        }
      } catch (err) {
        console.warn('Failed to load profile from Firestore:', err);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    loadProfile();
    return () => { cancelled = true; };
  }, [user]);

  // ── Local-only update (for onboarding steps) ──────────────────────
  const updateProfile = (updates: Partial<ProfileInfo>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  // ── Save profile to Firestore & mark onboarding complete ──────────
  const completeOnboarding = async (profileData: Partial<ProfileInfo>) => {
    const finalProfile = { ...profile, ...profileData };
    setProfile(finalProfile);
    setHasOnboarded(true);

    if (user) {
      try {
        const db = getGleamDb();
        await setDoc(doc(db, 'users', user.uid), {
          ...finalProfile,
          hasOnboarded: true,
          email: user.email,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save profile to Firestore:', err);
      }
    }
  };

  // ── Reset onboarding flag ─────────────────────────────────────────
  const resetOnboarding = async () => {
    setHasOnboarded(false);
    if (user) {
      try {
        const db = getGleamDb();
        await setDoc(doc(db, 'users', user.uid), {
          hasOnboarded: false,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.error('Failed to reset onboarding in Firestore:', err);
      }
    }
  };

  // ── GDPR: wipe all profile data ──────────────────────────────────
  const clearProfileData = async () => {
    setProfile(DEFAULT_PROFILE);
    setHasOnboarded(false);
    if (user) {
      try {
        const db = getGleamDb();
        await deleteDoc(doc(db, 'users', user.uid));
      } catch (err) {
        console.error('Failed to delete profile from Firestore:', err);
      }
    }
  };

  return (
    <ProfileContext.Provider value={{
      profile, hasOnboarded, profileLoading,
      updateProfile, completeOnboarding, resetOnboarding, clearProfileData,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    return {
      profile: {} as ProfileInfo,
      hasOnboarded: false,
      profileLoading: true,
      updateProfile: () => {},
      completeOnboarding: async () => {},
      resetOnboarding: async () => {},
      clearProfileData: async () => {},
    };
  }
  return context;
}
