import { useState, useEffect } from 'react';
import type { GroupWithMembership } from '../types/groups';
import { fetchMyGroups } from '../lib/groups';

interface UseGroupsReturn {
  groups: GroupWithMembership[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGroups(uid: string): UseGroupsReturn {
  const [groups, setGroups] = useState<GroupWithMembership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchMyGroups(uid);
      setGroups(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [uid]);

  return { groups, loading, error, refresh: load };
}
