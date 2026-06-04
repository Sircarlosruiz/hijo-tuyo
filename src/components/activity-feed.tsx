import { formatDistanceToNow } from 'date-fns';
import type { MatchRecord } from '../types/dashboard';
import { Avatar, Icon } from './ui';

interface ActivityFeedProps {
  activities: MatchRecord[];
  loading: boolean;
}

function activityVerb(margin: number): string {
  if (margin >= 3) return 'demolished';
  if (margin === 2) return 'beat';
  return 'edged';
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="ht-card ht-card-pad">
        <h2 className="ht-section-title" style={{ marginBottom: 16 }}>Recent Damage</h2>
        <div className="ht-muted" style={{ fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="ht-card ht-card-pad">
      <h2 className="ht-section-title" style={{ marginBottom: 16 }}>
        <Icon name="swords" style={{ width: 17, height: 17, color: 'var(--vs)' }} />
        Recent Damage
      </h2>

      {activities.length === 0 ? (
        <p className="ht-muted" style={{ fontSize: 14, margin: 0 }}>
          No matches yet. Somebody log a game.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activities.map((a, i) => {
            const margin = Math.abs(a.score1 - a.score2);
            const verb = activityVerb(margin);
            const loserName = a.winnerUid === a.player1Uid ? a.player2Name : a.player1Name;
            const winScore = Math.max(a.score1, a.score2);
            const loseScore = Math.min(a.score1, a.score2);

            return (
              <div
                key={a.id}
                className="ht-row ht-gap12"
                style={{
                  padding: '11px 0',
                  borderBottom: i < activities.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <Avatar uid={a.winnerUid} displayName={a.winnerName} size={36} />

                <div className="ht-grow">
                  <div style={{ fontSize: 14.5, lineHeight: 1.35 }}>
                    <strong>{a.winnerName}</strong>
                    <span className="ht-muted"> {verb} </span>
                    <strong>{loserName}</strong>
                  </div>
                  <div className="ht-faint" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {a.gameName}
                    {' · '}
                    <span className="ht-mono">{winScore}–{loseScore}</span>
                    {' · '}
                    {formatDistanceToNow(a.timestamp, { addSuffix: true })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
