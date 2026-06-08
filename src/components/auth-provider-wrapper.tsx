import { AuthProvider } from "../hooks/use-auth";
import { ActiveGroupProvider } from "../hooks/use-active-group";
import { useAuth } from "../hooks/use-auth";
import type { ComponentType, ReactNode } from "react";

export function withAuthProvider<P extends object>(
  Page: ComponentType<P>,
): ComponentType<P> {
  return function PageWithAuthProvider(props: P): React.JSX.Element {
    return (
      <AuthProvider>
        <Page {...props} />
      </AuthProvider>
    );
  };
}

interface WithActiveGroupProps {
  children: ReactNode;
}

export function WithActiveGroup({ children }: WithActiveGroupProps): React.JSX.Element {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <>{children}</>;
  }

  return (
    <ActiveGroupProvider uid={user.uid}>
      {children}
    </ActiveGroupProvider>
  );
}
