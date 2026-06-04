import { Avatar, Icon } from '../components/ui';
import type { StandingRow } from '../lib/standings-computer';

interface TournamentStandingsProps {
  standings: StandingRow[];
  currentUid: string;
}

export function TournamentStandings({
  standings,
  currentUid,
}: TournamentStandingsProps): React.JSX.Element | null {
  if (standings.length === 0) return null;

  return (
    <div>
      <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>Standings</h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {standings.map((row) => {
          const isYou = row.uid === currentUid;

          return (
            <div
              key={row.uid}
              className="ht-card ht-card-pad"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: isYou
                  ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-2))'
                  : undefined,
                border: isYou
                  ? '1px solid color-mix(in srgb, var(--accent) 30%, var(--line))'
                  : undefined,
              }}
            >
              <div className="ht-row" style={{ alignItems: 'center', gap: 12 }}>
                <span
                  className="ht-muted"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    minWidth: 24,
                    textAlign: 'center',
                  }}
                >
                  {row.rank}
                </span>
                <div className="ht-row" style={{ alignItems: 'center', gap: 8 }}>
                  <Avatar
                    uid={row.uid}
                    displayName={row.displayName}
                    size={28}
                    isYou={isYou}
                  />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {row.displayName}
                    {isYou && (
                      <span className="ht-faint" style={{ marginLeft: 6 }}>
                        (you)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="ht-row" style={{ alignItems: 'center', gap: 10 }}>
                {row.tieFlag && (
                  <span
                    className="ht-badge ht-badge-pending"
                    style={{ fontSize: 10 }}
                  >
                    <Icon name="swords" style={{ width: 10, height: 10 }} />
                    Tie
                  </span>
                )}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: 'var(--win)' }}>{row.wins}</span>
                  <span style={{ color: 'var(--text-faint)', margin: '0 3px' }}>–</span>
                  <span style={{ color: 'var(--loss)' }}>{row.losses}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
