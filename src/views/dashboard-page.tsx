import { useState } from 'react';
import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { LeaderboardChart } from '../components/leaderboard-chart';
import { GameFilter } from '../components/game-filter';
import { ActivityFeed } from '../components/activity-feed';
import { useDashboardData, useRecentActivity } from '../hooks/use-dashboard-data';

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

  const filteredStats = selectedGameId ? filterByGame(selectedGameId) : playerStats;

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
      <h1>Dashboard</h1>

      <GameFilter
        games={games}
        selectedGameId={selectedGameId}
        onChange={setSelectedGameId}
      />

      <h2>Overall Leaderboard</h2>
      <LeaderboardChart data={filteredStats} />

      <ActivityFeed activities={activities} loading={activityLoading} />
    </div>
  );
}

export const DashboardPage = withAuthProvider(DashboardPageContent);
