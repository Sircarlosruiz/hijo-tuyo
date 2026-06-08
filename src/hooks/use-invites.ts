import { useState, useEffect, useCallback } from 'react';
import type { InviteDoc, InviteDefaults } from '../types/groups';
import { fetchGroupInvites, createInvite, revokeInvite, regenerateInvite } from '../lib/groups';
import { fetchMembership } from '../lib/groups';

interface UseInvitesReturn {
  invites: Array<InviteDoc & { inviteId: string }>;
  loading: boolean;
  error: string | null;
  isOwner: boolean;
  createNew: (options?: Partial<InviteDefaults>) => Promise<void>;
  revoke: (inviteId: string) => Promise<void>;
  regenerate: (inviteId: string, options?: Partial<InviteDefaults>) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useInvites(
  groupId: string,
  uid: string,
): UseInvitesReturn {
  const [invites, setInvites] = useState<Array<InviteDoc & { inviteId: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  async function load(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const membership = await fetchMembership(groupId, uid);
      setIsOwner(membership?.role === 'owner');

      const fetched = await fetchGroupInvites(groupId);
      setInvites(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invites');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [groupId, uid]);

  const createNew = useCallback(
    async (options?: Partial<InviteDefaults>): Promise<void> => {
      await createInvite(groupId, uid, options);
      await load();
    },
    [groupId, uid],
  );

  const revoke = useCallback(
    async (inviteId: string): Promise<void> => {
      await revokeInvite(groupId, inviteId, uid);
      await load();
    },
    [groupId, uid],
  );

  const regenerate = useCallback(
    async (inviteId: string, options?: Partial<InviteDefaults>): Promise<void> => {
      await regenerateInvite(groupId, inviteId, uid, options);
      await load();
    },
    [groupId, uid],
  );

  return {
    invites,
    loading,
    error,
    isOwner,
    createNew,
    revoke,
    regenerate,
    refresh: load,
  };
}
