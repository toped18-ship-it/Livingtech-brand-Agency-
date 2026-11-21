import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Firebase is used strictly for Google OAuth sign-in popup; all application data is persisted in primary SQL storage.
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGooglePopup() {
  const credential = await signInWithPopup(firebaseAuth, googleAuthProvider);
  return credential.user;
}

export async function signOutFirebase() {
  try {
    await firebaseSignOut(firebaseAuth);
  } catch {
    // Ignore if user signed in via email/password SQL authentication only
  }
}
