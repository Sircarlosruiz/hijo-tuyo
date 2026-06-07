import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useActiveGroup } from '../hooks/use-active-group';
import { createGroup } from '../lib/groups';

interface CreateGroupFormProps {
  onSuccess?: (groupId: string) => void;
}

export function CreateGroupForm({ onSuccess }: CreateGroupFormProps): React.JSX.Element {
  const { user } = useAuth();
  const { setActiveGroup } = useActiveGroup();
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in to create a group');
      return;
    }

    if (!name.trim()) {
      setError('Group name cannot be empty');
      return;
    }

    setSubmitting(true);

    try {
      const groupId = await createGroup(user.uid, name);
      await setActiveGroup(groupId);
      onSuccess?.(groupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="ht-create-group-form" onSubmit={handleSubmit}>
      <h2>Create a Group</h2>

      <label htmlFor="group-name" className="ht-field-label">
        Group name
      </label>
      <input
        id="group-name"
        type="text"
        className="ht-input"
        placeholder="e.g. Weekend Ping Pong Crew"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        autoFocus
        disabled={submitting}
      />

      {error && <p className="ht-error">{error}</p>}

      <button
        type="submit"
        className="ht-btn ht-btn-primary"
        disabled={submitting || !name.trim()}
      >
        {submitting ? 'Creating...' : 'Create Group'}
      </button>
    </form>
  );
}
