import { Icon } from '../components/ui';
import type { TournamentDocument, GameOption, PlayerOption } from '../types/tournament';

interface TournamentListProps {
  tournaments: TournamentDocument[];
  games: GameOption[];
  players: PlayerOption[];
}

function getGameName(gameId: string, games: GameOption[]): string {
  return games.find((g) => g.id === gameId)?.name ?? 'Unknown';
}

function getParticipantNames(uids: string[], players: PlayerOption[]): string[] {
  return uids.map((uid) => players.find((p) => p.id === uid)?.displayName ?? 'Unknown');
}

export function TournamentList({
  tournaments,
  games,
  players,
}: TournamentListProps): React.JSX.Element {
  if (tournaments.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 22 }}>
          <div className="ht-eyebrow">No tournaments yet. Be the first.</div>
          <h1 className="ht-page-title">Tournaments</h1>
        </div>
        <div
          className="ht-card ht-card-pad"
          style={{ textAlign: 'center', padding: '48px 24px' }}
        >
          <Icon name="trophy" style={{ width: 48, height: 48, color: 'var(--text-dim)', marginBottom: 16 }} />
          <p className="ht-muted" style={{ marginBottom: 20 }}>
            No tournaments have been created yet.
          </p>
          <a href="/tournaments/new" className="ht-btn ht-btn-primary">
            <Icon name="plus" style={{ width: 16, height: 16 }} />
            Create Tournament
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ht-row ht-between" style={{ marginBottom: 22, alignItems: 'flex-end', gap: 16 }}>
        <div>
          <div className="ht-eyebrow">Who runs the bracket?</div>
          <h1 className="ht-page-title">Tournaments</h1>
        </div>
        <a
          href="/tournaments/new"
          className="ht-btn ht-btn-primary ht-nowrap"
          style={{ padding: '12px 18px', fontSize: 14, textDecoration: 'none' }}
        >
          <Icon name="plus" style={{ width: 17, height: 17 }} />
          New Tournament
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tournaments.map((t) => {
          const gameName = getGameName(t.gameId, games);
          const participantNames = getParticipantNames(t.participantUids, players);
          const playedCount = t.fixtures.filter((f) => f.status === 'played').length;
          const totalCount = t.fixtures.length;
          const isComplete = t.status === 'complete';

          return (
            <a
              key={t.id}
              href={`/tournaments/detail?id=${t.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="ht-card ht-card-pad"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  opacity: isComplete ? 0.7 : 1,
                  transition: 'all .14s',
                }}
              >
                <div className="ht-row ht-between" style={{ alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon
                      name={isComplete ? 'trophy' : 'bracket'}
                      style={{ width: 20, height: 20, color: isComplete ? 'var(--win)' : 'var(--accent)' }}
                    />
                    <strong style={{ fontSize: 16 }}>{t.name}</strong>
                  </div>
                  <span
                    className={`ht-badge ${isComplete ? 'ht-badge-win' : 'ht-badge-info'}`}
                    style={{ fontSize: 11 }}
                  >
                    {isComplete ? 'Complete' : 'Active'}
                  </span>
                </div>
                <div className="ht-row" style={{ gap: 16, flexWrap: 'wrap' }}>
                  <span className="ht-muted" style={{ fontSize: 13 }}>
                    {gameName}
                  </span>
                  <span className="ht-muted" style={{ fontSize: 13 }}>
                    {t.participantUids.length} players
                  </span>
                  <span className="ht-muted" style={{ fontSize: 13 }}>
                    {playedCount}/{totalCount} played
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {participantNames.slice(0, 4).join(', ')}
                  {participantNames.length > 4 && ` +${participantNames.length - 4} more`}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
