import { Avatar, Icon } from '../components/ui';
import type { TournamentFixture, PlayerOption } from '../types/tournament';

interface TournamentFixtureListProps {
  fixtures: TournamentFixture[];
  players: PlayerOption[];
  recordingFixtureId: string | null;
  onRecordClick: (fixtureId: string) => void;
  disabled: boolean;
}

function getPlayerName(uid: string, players: PlayerOption[]): string {
  return players.find((p) => p.id === uid)?.displayName ?? 'Unknown';
}

export function TournamentFixtureList({
  fixtures,
  players,
  recordingFixtureId,
  onRecordClick,
  disabled,
}: TournamentFixtureListProps): React.JSX.Element {
  const pendingCount = fixtures.filter((f) => f.status === 'pending').length;
  const playedCount = fixtures.filter((f) => f.status === 'played').length;

  return (
    <div>
      <div className="ht-row ht-between" style={{ marginBottom: 16, alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Fixtures</h2>
        <div className="ht-row" style={{ gap: 12 }}>
          <span className="ht-badge ht-badge-info" style={{ fontSize: 11 }}>
            {pendingCount} pending
          </span>
          <span className="ht-badge ht-badge-win" style={{ fontSize: 11 }}>
            {playedCount} played
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {fixtures.map((f, index) => {
          const p1Name = getPlayerName(f.player1Uid, players);
          const p2Name = getPlayerName(f.player2Uid, players);
          const isPlayed = f.status === 'played';
          const isRecording = recordingFixtureId === f.fixtureId;
          const isPending = f.status === 'pending';

          return (
            <div key={f.fixtureId}>
              <div
                className="ht-card ht-card-pad"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  opacity: isPlayed ? 0.7 : 1,
                }}
              >
                <div className="ht-row" style={{ alignItems: 'center', gap: 12, flex: 1 }}>
                  <span
                    className="ht-muted"
                    style={{ fontSize: 12, minWidth: 24, textAlign: 'center' }}
                  >
                    {index + 1}
                  </span>
                  <div className="ht-row" style={{ alignItems: 'center', gap: 8 }}>
                    <Avatar uid={f.player1Uid} displayName={p1Name} size={24} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{p1Name}</span>
                  </div>
                  <span className="ht-muted" style={{ fontSize: 12 }}>vs</span>
                  <div className="ht-row" style={{ alignItems: 'center', gap: 8 }}>
                    <Avatar uid={f.player2Uid} displayName={p2Name} size={24} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{p2Name}</span>
                  </div>
                </div>

                <div className="ht-row" style={{ alignItems: 'center', gap: 10 }}>
                  {isPending && !disabled && !isRecording && (
                    <button
                      type="button"
                      onClick={() => onRecordClick(f.fixtureId)}
                      className="ht-btn ht-btn-primary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      <Icon name="plus" style={{ width: 12, height: 12 }} />
                      Record
                    </button>
                  )}
                  <span
                    className={`ht-badge ${isPlayed ? 'ht-badge-win' : 'ht-badge-pending'}`}
                    style={{ fontSize: 11 }}
                  >
                    {isPlayed ? 'Played' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
