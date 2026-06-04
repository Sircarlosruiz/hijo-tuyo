import { AuthProvider } from "../hooks/use-auth";
import type { ComponentType } from "react";

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
