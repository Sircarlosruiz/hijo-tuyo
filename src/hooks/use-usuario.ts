import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase-client';

interface UsuarioDoc {
  nickname?: string | null;
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

interface UseUsuarioResult {
  usuario: UsuarioDoc | null;
  loading: boolean;
}

export function useUsuario(uid: string | undefined): UseUsuarioResult {
  const db = getFirestoreInstance();
  const [usuario, setUsuario] = useState<UsuarioDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setUsuario(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const ref = doc(db, 'usuarios', uid);
        const snap = await getDoc(ref);
        if (cancelled) return;

        if (snap.exists()) {
          setUsuario(snap.data() as UsuarioDoc);
        } else {
          setUsuario(null);
        }
      } catch {
        if (!cancelled) setUsuario(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, uid]);

  return { usuario, loading };
}
