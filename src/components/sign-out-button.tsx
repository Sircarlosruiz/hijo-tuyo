import { useState, useCallback } from 'react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { getAuthInstance } from '../lib/firebase-client';
import { Icon } from './ui';

interface SignOutButtonProps {
  onSignOut?: () => void;
}

export function SignOutButton({ onSignOut }: SignOutButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const auth = await getAuthInstance();
      await firebaseSignOut(auth);
      onSignOut?.();
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed. Please try again.';
      setError(message);
      console.error('Sign-out failed', { error: message });
    } finally {
      setIsLoading(false);
    }
  }, [onSignOut]);

  return (
    <div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isLoading}
        className="ht-btn ht-btn-ghost ht-btn-block"
      >
        <Icon name="signout" style={{ width: 18, height: 18 }} />
        {isLoading ? 'Signing out…' : 'Sign out'}
      </button>
      {error && (
        <p style={{ color: 'var(--loss)', fontSize: 13, marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}
