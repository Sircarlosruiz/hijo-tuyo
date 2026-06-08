import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { ActiveGroupContextValue, GroupWithMembership } from '../types/groups';
import { fetchMyGroups, setActiveGroup } from '../lib/groups';

const ActiveGroupContext = createContext<ActiveGroupContextValue | undefined>(undefined);

interface ActiveGroupProviderProps {
  children: ReactNode;
  uid: string;
}

export function ActiveGroupProvider({
  children,
  uid,
}: ActiveGroupProviderProps): React.JSX.Element {
  const [groups, setGroups] = useState<GroupWithMembership[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function resolve(): Promise<void> {
      try {
        const myGroups = await fetchMyGroups(uid);
        if (cancelled) return;

        setGroups(myGroups);

        if (myGroups.length === 0) {
          setActiveGroupId(null);
          setLoading(false);
          return;
        }

        // Try localStorage first for fast startup
        let resolvedGroupId: string | null = null;
        try {
          const stored = localStorage.getItem('activeGroupId');
          if (stored && myGroups.some((g) => g.id === stored)) {
            resolvedGroupId = stored;
          }
        } catch {
          // localStorage unavailable
        }

        // Fallback: try first group
        if (!resolvedGroupId) {
          resolvedGroupId = myGroups[0].id;
        }

        setActiveGroupId(resolvedGroupId);

        // Persist to Firestore
        try {
          await setActiveGroup(uid, resolvedGroupId);
        } catch {
          // Non-critical — context still works
        }
      } catch (error) {
        console.error('Failed to resolve active group', {
          uid,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void resolve();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const handleSetActiveGroup = useCallback(
    async (groupId: string): Promise<void> => {
      if (!groups.some((g) => g.id === groupId)) {
        throw new Error('Not a member of this group');
      }

      setActiveGroupId(groupId);

      try {
        localStorage.setItem('activeGroupId', groupId);
      } catch {
        // Non-critical
      }

      try {
        await setActiveGroup(uid, groupId);
      } catch (error) {
        console.error('Failed to persist active group', {
          groupId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [groups, uid],
  );

  const isOwner = useCallback(
    (groupId: string): boolean => {
      const group = groups.find((g) => g.id === groupId);
      return group?.myRole === 'owner';
    },
    [groups],
  );

  const value: ActiveGroupContextValue = {
    activeGroupId,
    groups,
    setActiveGroup: handleSetActiveGroup,
    loading,
    hasGroups: groups.length > 0,
    isOwner,
  };

  return (
    <ActiveGroupContext.Provider value={value}>
      {children}
    </ActiveGroupContext.Provider>
  );
}

export function useActiveGroup(): ActiveGroupContextValue {
  const context = useContext(ActiveGroupContext);
  if (context === undefined) {
    throw new Error('useActiveGroup must be used within an ActiveGroupProvider');
  }
  return context;
}
