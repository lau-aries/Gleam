import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBJGNSEbbQ5-P4gKwSAhqa2bMIsiHvT8z0",
  authDomain: "gleam-database.firebaseapp.com",
  projectId: "gleam-database",
  storageBucket: "gleam-database.firebasestorage.app",
  messagingSenderId: "500189320970",
  appId: "1:500189320970:web:7a5fad45b01364d1e50cf3"
};

let appInstance: FirebaseApp | null = null;

export function getGleamApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return appInstance;
}

// These are getters to ensure the underlying Firebase service is only 
// requested AFTER the relevant module (auth or firestore) has been 
// loaded and registered.
export const getGleamAuth = (): Auth => {
  return getAuth(getGleamApp());
};

export const getGleamDb = (): Firestore => {
  return getFirestore(getGleamApp());
};
