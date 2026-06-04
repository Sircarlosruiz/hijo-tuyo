import { useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { storeRedirectUrl } from "../lib/auth-redirect";
import { AuthLoading } from "./auth-loading";

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps): React.JSX.Element {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user === null) {
      const currentUrl = window.location.pathname + window.location.search;
      storeRedirectUrl(currentUrl);
      window.location.href = "/";
    }
  }, [loading, user]);

  if (loading) {
    return <AuthLoading />;
  }

  if (user === null) {
    return <AuthLoading />;
  }

  return <>{children}</>;
}
