import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useActiveGroup } from '../hooks/use-active-group';
import { Avatar } from './ui';
import { fetchGroupMembers, removeMember, leaveGroup } from '../lib/groups';

interface MemberInfo {
  uid: string;
  role: string;
}

interface MemberListProps {
  groupId: string;
}

export function MemberList({ groupId }: MemberListProps): React.JSX.Element {
  const { user } = useAuth();
  const { isOwner } = useActiveGroup();
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        setLoading(true);
        const fetched = await fetchGroupMembers(groupId);
        if (!cancelled) setMembers(fetched);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [groupId]);

  async function handleRemove(targetUid: string): Promise<void> {
    if (!user) return;
    setActionLoading(targetUid);
    setError(null);

    try {
      await removeMember(groupId, targetUid, user.uid);
      setMembers((prev) => prev.filter((m) => m.uid !== targetUid));
      setConfirmRemove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLeave(): Promise<void> {
    if (!user) return;
    setActionLoading('self');
    setError(null);

    try {
      await leaveGroup(groupId, user.uid);
      window.location.href = '/groups';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave group');
    } finally {
      setActionLoading(null);
    }
  }

  const isCurrentUserOwner = isOwner(groupId);
  const currentUserMember = members.find((m) => m.uid === user?.uid);

  if (loading) {
    return <div className="ht-faint">Loading members...</div>;
  }

  return (
    <div className="ht-member-list">
      <h3 style={{ fontSize: 16, marginBottom: 12 }}>
        Members ({members.length})
      </h3>

      {error && <p className="ht-error">{error}</p>}

      <ul className="ht-members" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {members.map((member) => (
          <li
            key={member.uid}
            className="ht-member-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <Avatar uid={member.uid} displayName={member.uid.slice(0, 8)} size={32} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
              {member.uid.slice(0, 12)}...
            </span>
            <span
              className={`ht-member-badge ${member.role}`}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 99,
                background: member.role === 'owner' ? 'var(--accent)' : 'var(--bg-3)',
                color: member.role === 'owner' ? '#fff' : 'var(--text-dim)',
                fontWeight: 600,
              }}
            >
              {member.role}
            </span>

            {isCurrentUserOwner && member.role !== 'owner' && (
              confirmRemove === member.uid ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12 }}>Remove?</span>
                  <button
                    type="button"
                    className="ht-btn ht-btn-sm ht-btn-danger"
                    onClick={() => handleRemove(member.uid)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === member.uid ? '...' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    className="ht-btn ht-btn-sm"
                    onClick={() => setConfirmRemove(null)}
                    disabled={!!actionLoading}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ht-btn ht-btn-sm ht-btn-danger"
                  onClick={() => setConfirmRemove(member.uid)}
                >
                  Remove
                </button>
              )
            )}
          </li>
        ))}
      </ul>

      {currentUserMember && currentUserMember.role !== 'owner' && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="ht-btn ht-btn-sm ht-btn-warn"
            onClick={handleLeave}
            disabled={!!actionLoading}
          >
            {actionLoading === 'self' ? 'Leaving...' : 'Leave Group'}
          </button>
        </div>
      )}
    </div>
  );
}
