import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type User, onAuthStateChanged } from "firebase/auth";
import { getAuthInstance } from "../lib/firebase-client";
import { syncUserToFirestore } from "../lib/firestore-user-sync";
import { type AuthContextValue } from "../types/auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setupAuthListener(): Promise<void> {
      try {
        const auth = await getAuthInstance();
        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
            void syncUserToFirestore(firebaseUser);
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Failed to initialize auth listener", {
          error: error instanceof Error ? error.message : String(error),
        });
        setLoading(false);
      }
    }

    void setupAuthListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
