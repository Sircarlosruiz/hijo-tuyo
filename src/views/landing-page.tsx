import { useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { SignInButton } from "../components/sign-in-button";
import { AuthLoading } from "../components/auth-loading";
import { withAuthProvider } from "../components/auth-provider-wrapper";

function LandingPageContent(): React.JSX.Element {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.href = "/dashboard";
    }
  }, [loading, user]);

  if (loading) {
    return <AuthLoading />;
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
      <h1>Gaming Leaderboard</h1>
      <p>Sign in to track your match history and compete on the leaderboard.</p>
      <SignInButton />
    </div>
  );
}

export const LandingPage = withAuthProvider(LandingPageContent);
