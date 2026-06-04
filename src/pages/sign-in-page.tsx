import { useCallback } from "react";
import { useAuth } from "../hooks/use-auth";
import { SignInButton } from "../components/sign-in-button";
import { SignOutButton } from "../components/sign-out-button";
import { AuthLoading } from "../components/auth-loading";
import { getStoredRedirectUrl } from "../components/require-auth";
import { withAuthProvider } from "../components/auth-provider-wrapper";

function SignInPageContent(): React.JSX.Element {
  const { user, loading } = useAuth();

  const handleSignInSuccess = useCallback((): void => {
    const redirectUrl = getStoredRedirectUrl();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = "/dashboard";
    }
  }, []);

  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "16px",
        }}
      >
        <h1>Welcome, {user.displayName || "User"}</h1>
        <p>You are already signed in.</p>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <h1>Sign In</h1>
      <p>Sign in to track your match history and compete on the leaderboard.</p>
      <SignInButton onSignInSuccess={handleSignInSuccess} />
    </div>
  );
}

export const SignInPage = withAuthProvider(SignInPageContent);
