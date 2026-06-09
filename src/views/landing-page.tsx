import { useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { SignInButton } from '../components/sign-in-button';
import { AuthLoading } from '../components/auth-loading';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { BrandMark } from '../components/ui';
import { getStoredRedirectUrl } from '../lib/auth-redirect';

function LandingPageContent(): React.JSX.Element {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const redirect = getStoredRedirectUrl();
      window.location.href = redirect ?? '/dashboard';
    }
  }, [loading, user]);

  if (loading) {
    return <AuthLoading />;
  }

  return (
    <div className="ht-landing">
      {/* top brand */}
      <div className="ht-row ht-gap8" style={{ position: 'absolute', top: 24, left: 28 }}>
        <BrandMark size={32} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '0.02em' }}>
          HIJO TUYO
        </span>
      </div>

      {/* hero */}
      <div className="ht-eyebrow" style={{ marginBottom: 18 }}>Gaming Leaderboard</div>

      <h1 className="ht-landing-hero">
        Talk is cheap.
        <br />
        <span style={{ color: 'var(--accent)', textShadow: '0 0 40px rgba(56,245,139,0.45)' }}>
          Wins are forever.
        </span>
      </h1>

      <p className="ht-landing-body">
        Log every match, track every rivalry, and find out who really runs the group.
      </p>

      {/* mini standings teaser */}
      <div className="ht-landing-standings ht-card" style={{ padding: '14px 0', marginBottom: 36 }}>
        <div style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--line)' }}>
          <div className="ht-eyebrow">Live standings</div>
        </div>
        {(['El Jefe', 'Tank', 'Lu', 'Sof'] as const).map((nick, i) => {
          const bar = [78, 54, 48, 38][i];
          const record = ['22–6', '15–12', '13–14', '10–18'][i];
          const color = ['var(--gold)', 'var(--text-dim)', '#d8965a', 'var(--text-faint)'][i];
          return (
            <div
              key={nick}
              className="ht-row"
              style={{ padding: '9px 16px', gap: 12 }}
            >
              <span
                className="ht-mono"
                style={{ width: 18, fontSize: 12, fontWeight: 700, color, textAlign: 'center' }}
              >
                {i + 1}
              </span>
              <div
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: ['var(--accent)', 'var(--vs)', 'var(--info)', 'var(--gold)'][i],
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12,
                  color: i === 0 ? 'var(--accent-ink)' : '#fff',
                  flexShrink: 0,
                }}
              >
                {nick[0]}
              </div>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{nick}</span>
              <div style={{ width: 64, height: 5, borderRadius: 99, background: 'var(--bg-3)', overflow: 'hidden' }}>
                <div style={{ width: `${bar}%`, height: '100%', background: 'var(--win)' }} />
              </div>
              <span className="ht-mono" style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 40, textAlign: 'right' }}>
                {record}
              </span>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <SignInButton />

      <p className="ht-faint" style={{ fontSize: 13, marginTop: 16 }}>
        For the squad only. No randoms.
      </p>
    </div>
  );
}

export const LandingPage = withAuthProvider(LandingPageContent);
