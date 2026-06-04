import { useState } from 'react';
import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { LeaderboardChart } from '../components/leaderboard-chart';
import { GameFilter } from '../components/game-filter';
import { ActivityFeed } from '../components/activity-feed';
import { NavProfileLink } from '../components/nav-profile-link';
import { RivalryModal } from '../components/rivalry-modal';
import { useDashboardData, useRecentActivity } from '../hooks/use-dashboard-data';
import type { PlayerStats } from '../types/dashboard';

function DashboardPageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent(): React.JSX.Element {
  const { playerStats, loading, error, games, filterByGame } = useDashboardData();
  const { activities, loading: activityLoading } = useRecentActivity(10);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedOpponent, setSelectedOpponent] = useState<{ uid: string; name: string } | null>(null);

  const filteredStats = selectedGameId ? filterByGame(selectedGameId) : playerStats;

  const handlePlayerClick = (player: PlayerStats): void => {
    setSelectedOpponent({ uid: player.uid, name: player.displayName });
  };

  const handleCloseModal = (): void => {
    setSelectedOpponent(null);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <h1>Dashboard</h1>
        <p>Loading stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: '#d32f2f',
        }}
      >
        <h1>Dashboard</h1>
        <p>Failed to load stats: {error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <NavProfileLink />
      </div>

      <h1>Dashboard</h1>

      <GameFilter
        games={games}
        selectedGameId={selectedGameId}
        onChange={setSelectedGameId}
      />

      <h2>Overall Leaderboard</h2>
      <LeaderboardChart data={filteredStats} onRowClick={handlePlayerClick} />

      <ActivityFeed activities={activities} loading={activityLoading} />

      {selectedOpponent && (
        <RivalryModal
          isOpen={!!selectedOpponent}
          opponentUid={selectedOpponent.uid}
          opponentName={selectedOpponent.name}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export const DashboardPage = withAuthProvider(DashboardPageContent);
