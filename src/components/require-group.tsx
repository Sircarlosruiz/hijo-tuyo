import { useEffect } from 'react';
import { useActiveGroup } from '../hooks/use-active-group';
import { AuthLoading } from './auth-loading';

interface RequireGroupProps {
  children: React.ReactNode;
  onNoGroups: () => React.ReactNode;
}

export function RequireGroup({
  children,
  onNoGroups,
}: RequireGroupProps): React.JSX.Element {
  const { loading, hasGroups } = useActiveGroup();

  if (loading) {
    return <AuthLoading />;
  }

  if (!hasGroups) {
    return <>{onNoGroups()}</>;
  }

  return <>{children}</>;
}
