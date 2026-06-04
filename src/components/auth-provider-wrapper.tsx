import { AuthProvider } from '../hooks/use-auth';
import type { ReactNode } from 'react';

interface AuthProviderWrapperProps {
  children: ReactNode;
}

export default function AuthProviderWrapper({ children }: AuthProviderWrapperProps): React.JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
