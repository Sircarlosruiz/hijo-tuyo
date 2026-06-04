import { useState, useCallback } from 'react';
import { signInWithPopup, GoogleAuthProvider, type User } from 'firebase/auth';
import { getAuthInstance } from '../lib/firebase-client';
import { Icon } from './ui';

interface SignInButtonProps {
  onSignInSuccess?: (user: User) => void;
}

function getErrorMessage(code: string, message?: string): string {
  if (message?.includes('CONFIGURATION_NOT_FOUND')) {
    return 'Firebase Authentication is not enabled for this project. Enable it in the Firebase Console.';
  }
  switch (code) {
    case 'auth/popup-closed-by-user': return '';
    case 'auth/popup-blocked': return 'Popup was blocked. Please allow popups for this site.';
    case 'auth/cancelled-popup-request': return '';
    case 'auth/internal-error': return 'Firebase Auth is not configured. Enable Authentication in the Firebase Console.';
    default: return 'Sign-in failed. Please try again.';
  }
}

export function SignInButton({ onSignInSuccess }: SignInButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError('');
    try {
      const auth = await getAuthInstance();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      onSignInSuccess?.(result.user);
    } catch (err) {
      const authError = err as { code?: string; message?: string };
      const code = authError.code;
      const rawMessage = typeof authError.message === 'string' ? authError.message : '';
      if (code) {
        const msg = getErrorMessage(code, rawMessage);
        if (msg) setError(msg);
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [onSignInSuccess]);

  return (
    <div style={{ width: '100%' }}>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        className="ht-btn ht-btn-google ht-btn-block"
        style={{ fontSize: 15, padding: '13px 20px' }}
      >
        <Icon name="google" style={{ width: 20, height: 20 }} />
        {isLoading ? 'Signing in…' : 'Continue with Google'}
      </button>
      {error && (
        <p style={{ color: 'var(--loss)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
