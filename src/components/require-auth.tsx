import { useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { AuthLoading } from "./auth-loading";

interface RequireAuthProps {
  children: React.ReactNode;
}

const REDIRECT_STORAGE_KEY = "auth_redirect_url";

export function RequireAuth({ children }: RequireAuthProps): React.JSX.Element {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user === null) {
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem(REDIRECT_STORAGE_KEY, currentUrl);
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

export function getStoredRedirectUrl(): string | null {
  const url = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
  if (url) {
    sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
    if (url.startsWith("/")) {
      return url;
    }
  }
  return null;
}
