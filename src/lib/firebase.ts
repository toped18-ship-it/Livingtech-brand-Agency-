import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
} from 'firebase/auth';
import { getDatabase, ref, set, update, type Database } from 'firebase/database';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';
import { LIVINGTECH_FIREBASE_CONFIG } from '../config/firebaseConfig';
import type { UserProfile, WorkspaceSummary } from '../shared/api-contracts';

export const firebaseApp: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(LIVINGTECH_FIREBASE_CONFIG);

let cachedAuth: Auth | null = null;
let cachedRtdb: Database | null = null;
let rtdbInitFailed = false;

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  try {
    cachedAuth = getAuth(firebaseApp);
    return cachedAuth;
  } catch {
    return null;
  }
}

export function getFirebaseRtdb(): Database | null {
  if (cachedRtdb) return cachedRtdb;
  if (rtdbInitFailed) return null;
  try {
    cachedRtdb = getDatabase(firebaseApp, LIVINGTECH_FIREBASE_CONFIG.databaseURL);
    return cachedRtdb;
  } catch {
    rtdbInitFailed = true;
    return null;
  }
}

let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  void isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(firebaseApp);
      }
    })
    .catch(() => {
      // Analytics is optional and may be blocked in headless/private browsers
    });
}

export function getFirebaseAnalytics(): Analytics | null {
  return analyticsInstance;
}

function sanitizeRtdbKey(raw: string): string {
  return raw.replace(/[.#$/[\]]/g, '_');
}

export async function getFirebaseIdToken(): Promise<string | null> {
  try {
    const auth = getFirebaseAuth();
    const current = auth?.currentUser;
    if (!current) return null;
    return await current.getIdToken();
  } catch {
    return null;
  }
}

export async function syncSessionSnapshotToRtdb(user: UserProfile, workspaces: WorkspaceSummary[]): Promise<void> {
  try {
    const db = getFirebaseRtdb();
    if (!db) return;

    const safeUserId = sanitizeRtdbKey(user.id);
    const now = new Date().toISOString();
    await update(ref(db, `livingtech_client/users/${safeUserId}`), {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      timezone: user.timezone,
      preferredLanguage: user.preferredLanguage,
      lastSyncedAt: now,
    });

    for (const ws of workspaces) {
      const safeWsId = sanitizeRtdbKey(ws.id);
      await set(ref(db, `livingtech_client/workspaces/${safeWsId}`), {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        ownerUserId: user.id,
        aiCreditsBalance: ws.aiCreditsBalance,
        planCode: ws.subscription?.planCode ?? 'none',
        planName: ws.subscription?.planName ?? 'No Active Plan',
        brandName: ws.brandProfile?.brandName ?? ws.name,
        primaryColor: ws.brandProfile?.primaryColor ?? '#0052FF',
        updatedAt: now,
      });
    }
  } catch {
    // Non-blocking: backend RTDB sync handles authoritative persistence if browser rules/App Check restrict direct writes
  }
}

export async function signInWithGooglePopup() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Authentication is unavailable in this browser context.');
  }
  const credential = await signInWithPopup(auth, googleAuthProvider);
  return credential.user;
}

export async function signInFirebaseEmailPassword(email: string, password: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  } catch {
    // Non-blocking: backend handles authoritative authentication & RTDB sync
  }
}

export async function signOutFirebase() {
  try {
    const auth = getFirebaseAuth();
    if (auth) {
      await firebaseSignOut(auth);
    }
  } catch {
    // Ignore if user signed in via email/password only
  }
}
