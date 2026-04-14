import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getGleamDb } from '@/services/firebaseConfig';
import {
  collection, doc, getDocs, setDoc, deleteDoc, updateDoc,
} from 'firebase/firestore';

export type Ingredient = {
  name: string;
  amount: string;
  unit: string;
};

export type Supplement = {
  id: string;
  name: string;
  category: string;
  totalBoxQuantity: number;
  remainingQuantity: number;
  reminderThreshold: number;
  dose?: string;
  frequency?: string;
  frequencyPerPeriod?: number;
  instructions?: string;
  ingredients?: Ingredient[];
  reason?: string;
  symptoms?: string;
  reviewPeriod?: string;
  manualTimingProtocol?: 'Morning' | 'Afternoon' | 'Evening';
  manualTimeString?: string;
};

type DailyOverride = {
  protocol: 'Morning' | 'Afternoon' | 'Evening';
  time?: string;
};

type DailyOverrides = Record<string, Record<string, DailyOverride>>;

interface CabinetContextType {
  cabinetItems: Supplement[];
  cabinetLoading: boolean;
  addSupplement: (supplement: Omit<Supplement, 'id'>) => Promise<void>;
  editSupplement: (id: string, updated: Omit<Supplement, 'id'>) => Promise<void>;
  removeSupplement: (id: string) => Promise<void>;
  takeSupplement: (id: string) => Promise<void>;
  dailyOverrides: DailyOverrides;
  setDailyOverride: (dateKey: string, itemId: string, protocol: 'Morning' | 'Afternoon' | 'Evening', time?: string) => Promise<void>;
}

const CabinetContext = createContext<CabinetContextType | undefined>(undefined);

// ── Firestore helpers ────────────────────────────────────────────────
function supplementsCol(uid: string) {
  return collection(getGleamDb(), 'users', uid, 'supplements');
}

function supplementDoc(uid: string, id: string) {
  return doc(getGleamDb(), 'users', uid, 'supplements', id);
}

function overridesDoc(uid: string, dateKey: string) {
  return doc(getGleamDb(), 'users', uid, 'dailyOverrides', dateKey);
}

// ── Provider ─────────────────────────────────────────────────────────
export function CabinetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cabinetItems, setCabinetItems] = useState<Supplement[]>([]);
  const [dailyOverrides, setDailyOverrides] = useState<DailyOverrides>({});
  const [cabinetLoading, setCabinetLoading] = useState(true);

  // ── Load supplements & overrides from Firestore on login ─────────
  useEffect(() => {
    if (!user) {
      setCabinetItems([]);
      setDailyOverrides({});
      setCabinetLoading(false);
      return;
    }

    let cancelled = false;

    const loadCabinet = async () => {
      setCabinetLoading(true);
      try {
        const db = getGleamDb();

        // Load supplements
        const supSnap = await getDocs(collection(db, 'users', user.uid, 'supplements'));
        const supplements: Supplement[] = [];
        supSnap.forEach(d => {
          supplements.push({ id: d.id, ...d.data() } as Supplement);
        });

        // Load daily overrides
        const ovSnap = await getDocs(collection(db, 'users', user.uid, 'dailyOverrides'));
        const overrides: DailyOverrides = {};
        ovSnap.forEach(d => {
          overrides[d.id] = d.data() as Record<string, DailyOverride>;
        });

        if (!cancelled) {
          setCabinetItems(supplements);
          setDailyOverrides(overrides);
        }
      } catch (err) {
        console.warn('Failed to load cabinet from Firestore:', err);
      } finally {
        if (!cancelled) setCabinetLoading(false);
      }
    };

    loadCabinet();
    return () => { cancelled = true; };
  }, [user]);

  // ── Add supplement ────────────────────────────────────────────────
  const addSupplement = async (item: Omit<Supplement, 'id'>) => {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newItem: Supplement = { ...item, id: newId };

    // Optimistic local update
    setCabinetItems(prev => [...prev, newItem]);

    // Persist to Firestore
    if (user) {
      try {
        const { id, ...data } = newItem;
        await setDoc(supplementDoc(user.uid, id), {
          ...data,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to save supplement:', err);
      }
    }
  };

  // ── Edit supplement ───────────────────────────────────────────────
  const editSupplement = async (id: string, updated: Omit<Supplement, 'id'>) => {
    // Optimistic local update
    setCabinetItems(prev => prev.map(item => item.id === id ? { ...updated, id } : item));

    // Persist to Firestore
    if (user) {
      try {
        await setDoc(supplementDoc(user.uid, id), {
          ...updated,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.error('Failed to update supplement:', err);
      }
    }
  };

  // ── Remove supplement ─────────────────────────────────────────────
  const removeSupplement = async (id: string) => {
    // Optimistic local update
    setCabinetItems(prev => prev.filter(item => item.id !== id));

    // Delete from Firestore
    if (user) {
      try {
        await deleteDoc(supplementDoc(user.uid, id));
      } catch (err) {
        console.error('Failed to delete supplement:', err);
      }
    }
  };

  // ── Take supplement (decrement remaining) ─────────────────────────
  const takeSupplement = async (id: string) => {
    let newQty = 0;

    // Optimistic local update
    setCabinetItems(prev =>
      prev.map(item => {
        if (item.id === id && item.remainingQuantity > 0) {
          newQty = item.remainingQuantity - 1;
          return { ...item, remainingQuantity: newQty };
        }
        return item;
      })
    );

    // Persist to Firestore
    if (user) {
      try {
        await updateDoc(supplementDoc(user.uid, id), {
          remainingQuantity: newQty,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to update supplement quantity:', err);
      }
    }
  };

  // ── Set daily override ────────────────────────────────────────────
  const setDailyOverrideHandler = async (
    dateKey: string,
    itemId: string,
    protocol: 'Morning' | 'Afternoon' | 'Evening',
    time?: string,
  ) => {
    // Optimistic local update
    setDailyOverrides(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [itemId]: { protocol, time },
      },
    }));

    // Persist to Firestore
    if (user) {
      try {
        const existing = dailyOverrides[dateKey] || {};
        await setDoc(overridesDoc(user.uid, dateKey), {
          ...existing,
          [itemId]: { protocol, ...(time ? { time } : {}) },
        }, { merge: true });
      } catch (err) {
        console.error('Failed to save daily override:', err);
      }
    }
  };

  return (
    <CabinetContext.Provider value={{
      cabinetItems,
      cabinetLoading,
      addSupplement,
      editSupplement,
      removeSupplement,
      takeSupplement,
      dailyOverrides,
      setDailyOverride: setDailyOverrideHandler,
    }}>
      {children}
    </CabinetContext.Provider>
  );
}

export function useCabinet() {
  const context = useContext(CabinetContext);
  if (context === undefined) {
    throw new Error('useCabinet must be used within a CabinetProvider');
  }
  return context;
}
