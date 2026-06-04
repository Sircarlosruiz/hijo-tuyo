import { useState } from 'react';
import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { GameFilter } from '../components/game-filter';
import { ActivityFeed } from '../components/activity-feed';
import { RivalryModal } from '../components/rivalry-modal';
import { Podium, StandingsTable } from '../components/podium-standings';
import { Icon } from '../components/ui';
import { useDashboardData, useRecentActivity } from '../hooks/use-dashboard-data';
import { useAuth } from '../hooks/use-auth';
import type { PlayerStats } from '../types/dashboard';

function DashboardContent(): React.JSX.Element {
  const { user } = useAuth();
  const { playerStats, loading, error, games, filterByGame } = useDashboardData();
  const { activities, loading: activityLoading } = useRecentActivity(10);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<{ uid: string; name: string } | null>(null);

  const filteredStats = selectedGameId ? filterByGame(selectedGameId) : playerStats;

  const handlePlayerClick = (player: PlayerStats): void => {
    setOpponent({ uid: player.uid, name: player.displayName });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 40 }}>
        <div className="ht-eyebrow">Loading standings…</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="ht-card" style={{ height: 60, opacity: 0.4, animation: 'none' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ht-card ht-card-pad" style={{ color: 'var(--loss)', marginTop: 40 }}>
        <strong>Failed to load standings:</strong> {error}
      </div>
    );
  }

  const top3 = filteredStats.slice(0, 3);

  return (
    <>
      <div className="ht-row ht-between" style={{ marginBottom: 22, alignItems: 'flex-end', gap: 16 }}>
        <div>
          <div className="ht-eyebrow">Who are you beating today?</div>
          <h1 className="ht-page-title">Standings</h1>
        </div>
        <a
          href="/match-entry"
          className="ht-btn ht-btn-primary ht-nowrap"
          style={{ padding: '12px 18px', fontSize: 14, textDecoration: 'none' }}
        >
          <Icon name="plus" style={{ width: 17, height: 17 }} />
          Log Match
        </a>
      </div>

      <GameFilter games={games} selectedGameId={selectedGameId} onChange={setSelectedGameId} />

      {top3.length >= 2 && (
        <Podium top={top3} currentUid={user?.uid ?? ''} onPlayer={handlePlayerClick} />
      )}

      <StandingsTable rows={filteredStats} currentUid={user?.uid ?? ''} onPlayer={handlePlayerClick} />

      <ActivityFeed activities={activities} loading={activityLoading} />

      {opponent && (
        <RivalryModal
          isOpen={!!opponent}
          opponentUid={opponent.uid}
          opponentName={opponent.name}
          onClose={() => setOpponent(null)}
        />
      )}
    </>
  );
}

function DashboardPageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <AppShell activePage="dashboard">
        <DashboardContent />
      </AppShell>
    </RequireAuth>
  );
}

export const DashboardPage = withAuthProvider(DashboardPageContent);
