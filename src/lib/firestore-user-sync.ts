import { type User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestoreInstance } from './firebase-client';

export interface UsuarioDoc {
  name: string | null;
  email: string | null;
  photoURL: string | null;
  registeredAt: ReturnType<typeof serverTimestamp>;
}

export async function syncUserToFirestore(user: User): Promise<void> {
  const db = getFirestoreInstance();
  const usuarioDoc: Omit<UsuarioDoc, 'registeredAt'> & { registeredAt: ReturnType<typeof serverTimestamp> } = {
    name: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    registeredAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'usuarios', user.uid), usuarioDoc, { merge: true });
  } catch (error) {
    console.error('Failed to sync user to Firestore', {
      uid: user.uid,
      error: error instanceof Error ? error.message : String(error),
    });
    // User is still authenticated even if Firestore write fails
  }
}
