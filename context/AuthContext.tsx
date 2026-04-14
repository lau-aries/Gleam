import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getGleamApp } from '@/services/firebaseConfig';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  User,
  Auth,
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      try {
        const auth: Auth = getAuth(getGleamApp());

        // Ensure auth state persists across page reloads (browser)
        await setPersistence(auth, browserLocalPersistence);

        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setIsLoading(false);
        });
      } catch (err) {
        console.warn('Firebase Auth init failed:', err);
        setIsLoading(false);
      }
    };

    initAuth();
    return () => unsubscribe?.();
  }, []);

  const login = async (email: string, password: string) => {
    const auth: Auth = getAuth(getGleamApp());
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    const auth: Auth = getAuth(getGleamApp());
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    const auth: Auth = getAuth(getGleamApp());
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    const auth: Auth = getAuth(getGleamApp());
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      user: null,
      isLoading: true,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      resetPassword: async () => {},
    } as AuthContextType;
  }
  return context;
}
