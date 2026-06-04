import { useState, useCallback } from "react";
import { signOut as firebaseSignOut } from "firebase/auth";
import { getAuthInstance } from "../lib/firebase-client";
import { AuthError } from "../types/auth";

interface SignOutButtonProps {
  onSignOut?: () => void;
}

export function SignOutButton({
  onSignOut,
}: SignOutButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSignOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const auth = await getAuthInstance();
      await firebaseSignOut(auth);
      window.location.href = "/";
      onSignOut?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Sign-out failed. Please try again.";
      setError(message);
      console.error("Sign-out failed", { error: message });
    } finally {
      setIsLoading(false);
    }
  }, [onSignOut]);

  return (
    <div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isLoading}
        style={{
          padding: "8px 16px",
          fontSize: "14px",
          cursor: isLoading ? "not-allowed" : "pointer",
          backgroundColor: isLoading ? "#ccc" : "#d32f2f",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
        }}
      >
        {isLoading ? "Signing out..." : "Sign out"}
      </button>
      {error && <p style={{ color: "#d32f2f", marginTop: "8px" }}>{error}</p>}
    </div>
  );
}
