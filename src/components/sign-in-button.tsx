import { useState, useCallback } from "react";
import { signInWithPopup, GoogleAuthProvider, type User } from "firebase/auth";
import { getAuthInstance } from "../lib/firebase-client";
import { AuthError } from "../types/auth";

interface SignInButtonProps {
  onSignInSuccess?: (user: User) => void;
}

function getErrorMessage(code: string, message?: string): string {
  if (message?.includes("CONFIGURATION_NOT_FOUND")) {
    return "Firebase Authentication is not enabled for this project. Enable it in the Firebase Console (Authentication > Get started) and turn on the Google sign-in provider.";
  }

  switch (code) {
    case "auth/popup-closed-by-user":
      return "";
    case "auth/popup-blocked":
      return "Popup was blocked. Please allow popups for this site.";
    case "auth/cancelled-popup-request":
      return "";
    case "auth/internal-error":
      return "Firebase Auth is not configured. Enable Authentication in the Firebase Console and add localhost to authorized domains.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export function SignInButton({
  onSignInSuccess,
}: SignInButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSignIn = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const auth = await getAuthInstance();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onSignInSuccess?.(result.user);
    } catch (err) {
      const authError = err as { code?: string; message?: string };
      const code = authError.code;
      const rawMessage =
        typeof authError.message === "string" ? authError.message : "";
      if (code) {
        const message = getErrorMessage(code, rawMessage);
        if (message) {
          setError(message);
        }
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [onSignInSuccess]);

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          cursor: isLoading ? "not-allowed" : "pointer",
          backgroundColor: isLoading ? "#ccc" : "#4285F4",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
        }}
      >
        {isLoading ? "Signing in..." : "Sign in with Google"}
      </button>
      {error && <p style={{ color: "#d32f2f", marginTop: "8px" }}>{error}</p>}
    </div>
  );
}
