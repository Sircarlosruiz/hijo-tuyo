import { useCallback } from 'react';
import { useAuth } from '../hooks/use-auth';
import { SignInButton } from '../components/sign-in-button';
import { SignOutButton } from '../components/sign-out-button';
import { AuthLoading } from '../components/auth-loading';
import { getStoredRedirectUrl } from '../lib/auth-redirect';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { BrandMark } from '../components/ui';

function SignInPageContent(): React.JSX.Element {
  const { user, loading } = useAuth();

  const handleSignInSuccess = useCallback((): void => {
    const redirectUrl = getStoredRedirectUrl();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = '/dashboard';
    }
  }, []);

  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div className="ht-card ht-card-pad" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <div className="ht-eyebrow" style={{ marginBottom: 10 }}>Already signed in</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 6 }}>
            {user.displayName ?? 'Player'}
          </div>
          <p className="ht-muted" style={{ fontSize: 14, margin: '0 0 20px' }}>
            {user.email}
          </p>
          <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
            <a href="/dashboard" className="ht-btn ht-btn-primary ht-btn-block" style={{ textDecoration: 'none' }}>
              Go to standings
            </a>
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
    }}>
      <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <BrandMark size={48} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, letterSpacing: '0.02em' }}>
          HIJO TUYO
        </div>
      </div>

      <div className="ht-card ht-card-pad" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div className="ht-eyebrow" style={{ marginBottom: 8 }}>Sign in</div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26,
          margin: '0 0 8px', lineHeight: 1.1,
        }}>
          Sign in to play
        </h1>
        <p className="ht-muted" style={{ fontSize: 14, margin: '0 0 24px' }}>
          Track your record, see rivalries, and climb the board.
        </p>
        <SignInButton onSignInSuccess={handleSignInSuccess} />
        <p className="ht-faint" style={{ fontSize: 12, marginTop: 16 }}>
          For the squad only. No randoms.
        </p>
      </div>
    </div>
  );
}

export const SignInPage = withAuthProvider(SignInPageContent);
