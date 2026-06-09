import { useState, type FormEvent, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/use-auth';
import { redeemInvite } from '../lib/groups';
import { syncUserToFirestore } from '../lib/firestore-user-sync';

interface JoinGroupFormProps {
  initialCode?: string;
  onSuccess?: (groupId: string) => void;
}

export function JoinGroupForm({
  initialCode,
  onSuccess,
}: JoinGroupFormProps): React.JSX.Element {
  const { user } = useAuth();
  const [code, setCode] = useState<string>(initialCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [alreadyMember, setAlreadyMember] = useState<boolean>(false);
  const autoRedeemAttempted = useRef<boolean>(false);

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  async function redeemCode(inviteCode: string): Promise<void> {
    if (!user) {
      setError('You must be signed in to join a group');
      return;
    }

    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) {
      setError('Invite code cannot be empty');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    setAlreadyMember(false);

    try {
      await syncUserToFirestore(user);
      const result = await redeemInvite(normalizedCode, user.uid, user);

      if (result.alreadyMember) {
        setAlreadyMember(true);
        setSuccess('You are already a member of this group!');
      } else {
        setSuccess('You joined the group successfully!');
      }

      onSuccess?.(result.groupId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join group';
      console.error('Failed to redeem invite', { uid: user.uid, error: message });
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!user || !initialCode?.trim() || autoRedeemAttempted.current) {
      return;
    }

    autoRedeemAttempted.current = true;
    void redeemCode(initialCode);
  }, [user, initialCode]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    await redeemCode(code);
  }

  return (
    <form className="ht-join-group-form" onSubmit={handleSubmit}>
      <h2>Join a Group</h2>

      <label htmlFor="invite-code" className="ht-field-label">
        Invite code
      </label>
      <input
        id="invite-code"
        type="text"
        className="ht-input"
        placeholder="Enter your invite code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={16}
        autoFocus
        disabled={submitting}
        style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
      />

      {error && <p className="ht-error">{error}</p>}
      {success && (
        <p className={`ht-success ${alreadyMember ? 'ht-info' : ''}`}>{success}</p>
      )}

      <button
        type="submit"
        className="ht-btn ht-btn-primary"
        disabled={submitting || !code.trim()}
      >
        {submitting ? 'Joining...' : 'Join Group'}
      </button>
    </form>
  );
}
