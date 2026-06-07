import { useState, type FormEvent, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { redeemInvite } from '../lib/groups';

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

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAlreadyMember(false);

    if (!user) {
      setError('You must be signed in to join a group');
      return;
    }

    if (!code.trim()) {
      setError('Invite code cannot be empty');
      return;
    }

    setSubmitting(true);

    try {
      const result = await redeemInvite(code.trim().toUpperCase(), user.uid);

      if (result.alreadyMember) {
        setAlreadyMember(true);
        setSuccess('You are already a member of this group!');
      } else {
        setSuccess('You joined the group successfully!');
        onSuccess?.(result.groupId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setSubmitting(false);
    }
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
