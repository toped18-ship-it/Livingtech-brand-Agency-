export interface LivingTechFirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string | undefined> }).env) || {};

export const DEFAULT_FIREBASE_DATABASE_URL = 'https://livingtech-brand-agency-default-rtdb.firebaseio.com';

export const LIVINGTECH_FIREBASE_CONFIG: LivingTechFirebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || 'AIzaSyDXLNVbNX-sU5jakxMtB5EJcM5TWkWS3Vo',
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || 'livingtech-brand-agency.firebaseapp.com',
  databaseURL: viteEnv.VITE_FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_DATABASE_URL,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || 'livingtech-brand-agency',
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || 'livingtech-brand-agency.firebasestorage.app',
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '795478435500',
  appId: viteEnv.VITE_FIREBASE_APP_ID || '1:795478435500:web:7330ba743889d7fad62109',
  measurementId: viteEnv.VITE_FIREBASE_MEASUREMENT_ID || 'G-MM3KYW2G3V',
};
