import { formatDistanceToNow } from 'date-fns';
import type { MatchRecord } from '../types/dashboard';

interface ActivityFeedProps {
  activities: MatchRecord[];
  loading: boolean;
}

export function ActivityFeed({
  activities,
  loading,
}: ActivityFeedProps): React.JSX.Element {
  if (loading) {
    return <p>Loading activity...</p>;
  }

  if (activities.length === 0) {
    return <p>No recent activity.</p>;
  }

  return (
    <div style={{ width: '100%', maxWidth: '600px', marginTop: '2rem' }}>
      <h2>Recent Activity</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {activities.map((match) => (
          <li
            key={match.id}
            style={{
              padding: '0.75rem 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{match.gameName}</div>
            <div>
              {match.player1Name} {match.score1} - {match.score2} {match.player2Name}
            </div>
            <div style={{ color: '#666', fontSize: '0.875rem' }}>
              Winner: {match.winnerName} ·{' '}
              {formatDistanceToNow(match.timestamp, { addSuffix: true })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
