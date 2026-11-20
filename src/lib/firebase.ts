import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth.currentUser?.uid,
      email: firebaseAuth.currentUser?.email,
      emailVerified: firebaseAuth.currentUser?.emailVerified,
      isAnonymous: firebaseAuth.currentUser?.isAnonymous,
      tenantId: firebaseAuth.currentUser?.tenantId,
      providerInfo:
        firebaseAuth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function signInWithGooglePopup() {
  const credential = await signInWithPopup(firebaseAuth, googleAuthProvider);
  const fbUser = credential.user;

  // Mirror verified user profile into Firestore under hardened security rules
  if (fbUser.emailVerified && fbUser.email) {
    const userPath = `users/${fbUser.uid}`;
    try {
      await setDoc(
        doc(firestoreDb, 'users', fbUser.uid),
        {
          uid: fbUser.uid,
          email: fbUser.email,
          fullName: (fbUser.displayName || fbUser.email.split('@')[0]).slice(0, 120),
          role: 'customer',
          emailVerified: fbUser.emailVerified,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          preferredLanguage: 'en',
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      // Non-blocking if profile already exists with different immutable fields
      console.warn('Firestore profile mirror notice:', userPath, err instanceof Error ? err.message : String(err));
    }
  }

  return fbUser;
}

export async function signOutFirebase() {
  try {
    await firebaseSignOut(firebaseAuth);
  } catch {
    // Ignore if user signed in via email/password backend only
  }
}
