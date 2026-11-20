import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { GameState } from './types/game';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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
    providerInfo?: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export interface CloudSaveSummary {
  id: string;
  saveName: string;
  managerName: string;
  clubName: string;
  leagueName: string;
  division: 'MASCULINO' | 'FEMININO';
  season: number;
  currentDay: number;
  stateMap: GameState;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export async function listCloudSaves(uid: string): Promise<CloudSaveSummary[]> {
  const path = `users/${uid}/saves`;
  try {
    const q = query(collection(db, 'users', uid, 'saves'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        saveName: String(data.saveName || 'Carreira'),
        managerName: String(data.managerName || 'Técnico'),
        clubName: String(data.clubName || 'Clube'),
        leagueName: String(data.leagueName || 'Liga'),
        division: data.division === 'FEMININO' ? 'FEMININO' : 'MASCULINO',
        season: Number(data.season || 2026),
        currentDay: Number(data.currentDay || 1),
        stateMap: data.stateMap as GameState,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCareerToCloud(
  uid: string,
  saveId: string,
  gameState: GameState,
  leagueName: string,
  clubName: string,
): Promise<void> {
  const safeId = saveId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'slot_1';
  const path = `users/${uid}/saves/${safeId}`;
  const ref = doc(db, 'users', uid, 'saves', safeId);

  try {
    const existingSnap = await getDoc(ref);
    const cleanState = stripUndefinedDeep(gameState);
    const basePayload = {
      ownerId: uid,
      saveName: `${clubName} · Temp. ${gameState.season}`.slice(0, 80),
      managerName: gameState.managerName.slice(0, 40) || 'Técnico',
      clubName: clubName.slice(0, 60),
      leagueName: leagueName.slice(0, 60),
      division: gameState.division,
      season: gameState.season,
      currentDay: gameState.currentDay,
      stateMap: cleanState,
      updatedAt: serverTimestamp(),
    };

    if (existingSnap.exists()) {
      await setDoc(
        ref,
        {
          ...basePayload,
          createdAt: existingSnap.data().createdAt,
        },
        { merge: false },
      );
    } else {
      await setDoc(ref, {
        ...basePayload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudSave(uid: string, saveId: string): Promise<void> {
  const path = `users/${uid}/saves/${saveId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'saves', saveId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
