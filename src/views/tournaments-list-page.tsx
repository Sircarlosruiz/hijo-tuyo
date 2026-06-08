import { RequireAuth } from '../components/require-auth';
import { withAuthProvider, WithActiveGroup } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { TournamentList } from '../components/tournament-list';
import { useTournaments, useTournamentCreateData } from '../hooks/use-tournaments';
import { useActiveGroup } from '../hooks/use-active-group';

function TournamentsListContent(): React.JSX.Element {
  const { activeGroupId, loading: groupLoading } = useActiveGroup();
  const { tournaments, loading, error } = useTournaments(activeGroupId ?? undefined);
  const { games, players, loading: dataLoading, error: dataError } = useTournamentCreateData();

  if (groupLoading || loading || dataLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 40 }}>
        <div className="ht-eyebrow">Loading tournaments…</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="ht-card"
              style={{ height: 80, opacity: 0.4, animation: 'none' }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || dataError) {
    return (
      <div className="ht-card ht-card-pad" style={{ color: 'var(--loss)', marginTop: 40 }}>
        <strong>Failed to load:</strong> {error ?? dataError}
      </div>
    );
  }

  return <TournamentList tournaments={tournaments} games={games} players={players} />;
}

function TournamentsListPageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <WithActiveGroup>
        <AppShell activePage="tournaments">
          <TournamentsListContent />
        </AppShell>
      </WithActiveGroup>
    </RequireAuth>
  );
}

export const TournamentsListPage = withAuthProvider(TournamentsListPageContent);
