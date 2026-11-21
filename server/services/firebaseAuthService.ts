import { LIVINGTECH_FIREBASE_CONFIG } from '../../src/config/firebaseConfig';
import { logger } from '../env';

export interface FirebaseEmailAuthResult {
  localId: string;
  idToken: string;
  email: string;
  displayName: string;
}

export type FirebaseAuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

let customAuthFetch: FirebaseAuthFetchFn | null = null;
const AUTH_TIMEOUT_MS = 5_000;

export function setFirebaseAuthFetchForTest(fn: FirebaseAuthFetchFn | null) {
  customAuthFetch = fn;
}

export function isFirebaseEmailAuthEnabled(): boolean {
  if (customAuthFetch) return true;
  if (process.env.DISABLE_FIREBASE_AUTH_SYNC === 'true') return false;
  if (process.env.NODE_ENV === 'test') return false;
  return Boolean(getFirebaseWebApiKey());
}

function getFirebaseWebApiKey(): string {
  return (
    process.env.FIREBASE_WEB_API_KEY?.trim() ||
    process.env.VITE_FIREBASE_API_KEY?.trim() ||
    LIVINGTECH_FIREBASE_CONFIG.apiKey ||
    ''
  );
}

async function doAuthFetch(url: string, init?: RequestInit): Promise<Response> {
  const transport = customAuthFetch ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await transport(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class FirebaseEmailExistsError extends Error {
  constructor() {
    super('An account with this email already exists. Please sign in instead.');
    this.name = 'FirebaseEmailExistsError';
  }
}

/**
 * Registers an email/password account in Firebase Authentication (Identity Toolkit)
 * so user credentials persist durably across stateless serverless cold starts.
 */
export async function firebaseSignUpWithEmailPassword(
  emailInput: string,
  password: string,
  fullName: string
): Promise<FirebaseEmailAuthResult | null> {
  if (!isFirebaseEmailAuthEnabled()) return null;

  const apiKey = getFirebaseWebApiKey();
  const email = emailInput.trim().toLowerCase();

  try {
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`;
    const resp = await doAuthFetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const data = (await resp.json().catch(() => ({}))) as {
      localId?: string;
      idToken?: string;
      email?: string;
      error?: { message?: string };
    };

    if (!resp.ok) {
      const code = String(data?.error?.message || '');
      if (code.startsWith('EMAIL_EXISTS')) {
        throw new FirebaseEmailExistsError();
      }
      logger.warn('Firebase Auth signUp skipped', { status: resp.status, code });
      return null;
    }

    if (!data.localId || !data.idToken) return null;

    // Best-effort profile displayName sync
    const trimmedName = fullName.trim();
    if (trimmedName) {
      const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(apiKey)}`;
      await doAuthFetch(updateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: data.idToken,
          displayName: trimmedName,
          returnSecureToken: false,
        }),
      }).catch(() => undefined);
    }

    return {
      localId: data.localId,
      idToken: data.idToken,
      email: (data.email || email).toLowerCase(),
      displayName: trimmedName || email.split('@')[0],
    };
  } catch (err) {
    if (err instanceof FirebaseEmailExistsError) {
      throw err;
    }
    logger.warn('Firebase Auth signUp network fallback', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Verifies an email/password pair against Firebase Authentication (Identity Toolkit).
 * Returns the verified Firebase user profile + ID token on success, or null if credentials are invalid/unavailable.
 */
export async function firebaseSignInWithEmailPassword(
  emailInput: string,
  password: string
): Promise<FirebaseEmailAuthResult | null> {
  if (!isFirebaseEmailAuthEnabled()) return null;

  const apiKey = getFirebaseWebApiKey();
  const email = emailInput.trim().toLowerCase();

  try {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
    const resp = await doAuthFetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    if (!resp.ok) {
      return null;
    }

    const data = (await resp.json().catch(() => ({}))) as {
      localId?: string;
      idToken?: string;
      email?: string;
      displayName?: string;
    };

    if (!data.localId || !data.idToken) return null;

    return {
      localId: data.localId,
      idToken: data.idToken,
      email: (data.email || email).toLowerCase(),
      displayName: (data.displayName || '').trim() || email.split('@')[0],
    };
  } catch (err) {
    logger.warn('Firebase Auth signIn lookup error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
