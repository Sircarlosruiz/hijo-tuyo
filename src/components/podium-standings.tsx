import { Avatar, RecordPill, StreakBadge, Icon, WinBar, uidColor } from './ui';
import type { PlayerStats } from '../types/dashboard';

/* Augment PlayerStats with an optional streak for display */
export interface PlayerStatsWithStreak extends PlayerStats {
  streak?: { type: 'W' | 'L' | null; count: number };
}

const MEDAL_COLORS = ['var(--gold)', '#cfd6e4', '#d8965a'];
const PODIUM_HEIGHTS = [104, 74, 56];
const PODIUM_SIZES = [76, 62, 56];

interface PodiumProps {
  top: PlayerStatsWithStreak[];
  currentUid: string;
  onPlayer: (player: PlayerStatsWithStreak) => void;
}

export function Podium({ top, currentUid, onPlayer }: PodiumProps): React.JSX.Element {
  const [first, second, third] = top;
  const display = [second, first, third].filter(Boolean) as PlayerStatsWithStreak[];
  const rankOf = (p: PlayerStatsWithStreak) => top.indexOf(p);

  return (
    <div className="ht-card ht-card-pad" style={{ marginBottom: 18 }}>
      <div className="ht-row ht-between" style={{ marginBottom: 18 }}>
        <h2 className="ht-section-title">
          <Icon name="standings" style={{ width: 18, height: 18, color: 'var(--accent)' }} />
          The Podium
        </h2>
        <span className="ht-eyebrow">TOP 3</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
        {display.map((pl) => {
          const rank = rankOf(pl);
          const isYou = pl.uid === currentUid;
          const col = MEDAL_COLORS[rank];
          const h = PODIUM_HEIGHTS[rank];
          const sz = PODIUM_SIZES[rank];

          return (
            <button
              key={pl.uid}
              type="button"
              onClick={() => !isYou && onPlayer(pl)}
              style={{
                flex: 1, maxWidth: 150, background: 'none', border: 'none', padding: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                cursor: isYou ? 'default' : 'pointer',
              }}
            >
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Avatar
                  uid={pl.uid}
                  displayName={pl.displayName}
                  size={sz}
                  ring
                  glow={rank === 0}
                  isYou={isYou}
                />
                {rank === 0 && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', color: 'var(--gold)' }}>
                    <Icon name="standings" style={{ width: 20, height: 20 }} />
                  </div>
                )}
              </div>

              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: rank === 0 ? 16 : 14, textAlign: 'center', lineHeight: 1.1,
              }}>
                {pl.displayName}
                {isYou && (
                  <span style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 5, fontFamily: 'var(--font-mono)' }}>
                    YOU
                  </span>
                )}
              </div>

              <div style={{ margin: '5px 0 11px' }}>
                <RecordPill wins={pl.wins} losses={pl.losses} size="sm" />
              </div>

              <div style={{
                width: '100%', height: h, borderRadius: '10px 10px 0 0',
                background: `linear-gradient(180deg, color-mix(in srgb, ${col} 26%, var(--bg-2)), var(--bg-2))`,
                border: '1px solid var(--line-strong)', borderBottom: 'none',
                display: 'grid', placeItems: 'center',
              }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: rank === 0 ? 38 : 28,
                  fontWeight: 700, color: col,
                  textShadow: `0 0 14px ${col}`,
                }}>
                  {rank + 1}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface StandingsTableProps {
  rows: PlayerStatsWithStreak[];
  currentUid: string;
  onPlayer: (player: PlayerStatsWithStreak) => void;
}

export function StandingsTable({ rows, currentUid, onPlayer }: StandingsTableProps): React.JSX.Element {
  return (
    <div className="ht-card" style={{ marginBottom: 18, overflow: 'hidden' }}>
      <div className="ht-row ht-between ht-card-pad" style={{ paddingBottom: 12 }}>
        <h2 className="ht-section-title">Full Table</h2>
        <span className="ht-eyebrow ht-nowrap" style={{ fontSize: 10 }}>Tap player for H2H</span>
      </div>
      <hr className="ht-divider" />

      {rows.length === 0 ? (
        <div className="ht-card-pad ht-center ht-muted">No matches yet. Log a game.</div>
      ) : (
        rows.map((pl, i) => {
          const isYou = pl.uid === currentUid;
          const medal = MEDAL_COLORS[i] ?? 'var(--text-faint)';
          const accentBorder = isYou ? 'var(--accent)' : 'transparent';
          const rowBg = isYou ? 'color-mix(in srgb, var(--accent) 7%, transparent)' : 'transparent';

          return (
            <button
              key={pl.uid}
              type="button"
              onClick={() => !isYou && onPlayer(pl)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 13,
                padding: '13px 20px',
                background: rowBg,
                border: 'none',
                borderLeft: `3px solid ${accentBorder}`,
                borderBottom: '1px solid var(--line)',
                textAlign: 'left',
                cursor: isYou ? 'default' : 'pointer',
              }}
            >
              <span className="ht-mono" style={{
                width: 22, textAlign: 'center', fontWeight: 700,
                fontSize: 15, color: medal, flexShrink: 0,
              }}>
                {i + 1}
              </span>

              <Avatar uid={pl.uid} displayName={pl.displayName} size={38} ring={i < 3} isYou={isYou} />

              <div className="ht-grow">
                <div className="ht-row ht-gap8" style={{ alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>{pl.displayName}</span>
                  {isYou && (
                    <span style={{ color: 'var(--accent)', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                      YOU
                    </span>
                  )}
                  {pl.streak && <StreakBadge streak={pl.streak} />}
                </div>
                <div style={{ marginTop: 5, maxWidth: 120 }}>
                  <WinBar rate={pl.winRate} />
                </div>
              </div>

              <div style={{ textAlign: 'right', minWidth: 64 }}>
                <RecordPill wins={pl.wins} losses={pl.losses} />
                <div className="ht-mono ht-faint" style={{ fontSize: 11, marginTop: 2 }}>
                  {Math.round(pl.winRate * 100)}%
                </div>
              </div>

              {!isYou && <Icon name="chevron" style={{ width: 16, height: 16, color: 'var(--text-faint)' }} />}
              {isYou && <span style={{ width: 16, flexShrink: 0 }} />}
            </button>
          );
        })
      )}
    </div>
  );
}
