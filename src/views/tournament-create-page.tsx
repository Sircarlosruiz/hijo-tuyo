import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { TournamentCreateForm } from '../components/tournament-create-form';
import { useTournamentCreateData } from '../hooks/use-tournaments';

function TournamentCreateContent(): React.JSX.Element {
  const { games, players, loading, error } = useTournamentCreateData();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 40 }}>
        <div className="ht-eyebrow">Loading…</div>
        <div className="ht-card" style={{ height: 200, opacity: 0.4, animation: 'none' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ht-card ht-card-pad" style={{ color: 'var(--loss)', marginTop: 40 }}>
        <strong>Failed to load:</strong> {error}
      </div>
    );
  }

  return <TournamentCreateForm games={games} players={players} />;
}

function TournamentCreatePageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <AppShell activePage="tournaments">
        <TournamentCreateContent />
      </AppShell>
    </RequireAuth>
  );
}

export const TournamentCreatePage = withAuthProvider(TournamentCreatePageContent);
