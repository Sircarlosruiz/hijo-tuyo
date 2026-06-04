import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/use-auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase-client';
import { FirestoreError } from '../types/dashboard';
import { formatDistanceToNow, format } from 'date-fns';
import { Avatar, Icon, RecordPill } from './ui';

interface RivalryModalProps {
  isOpen: boolean;
  opponentUid: string;
  opponentName: string;
  onClose: () => void;
}

interface RivalryRecord { wins: number; losses: number; total: number; }
interface PerGameRecord { gameId: string; gameName: string; wins: number; losses: number; total: number; }
interface LastMatch {
  gameName: string; yourScore: number; theirScore: number;
  youWon: boolean; dateLabel: string;
}
interface H2HStreak { type: 'W' | 'L' | null; count: number; }

interface FilteredPartido {
  id: string; gameId: string;
  player1Uid: string; player2Uid: string;
  score1: number; score2: number;
  winnerUid: string; createdAt: Date;
}

interface FirestorePartido {
  gameId: string; player1Uid: string; player2Uid: string;
  score1: number; score2: number; winnerUid: string;
  createdAt: { toDate: () => Date };
}

async function fetchJuegos(): Promise<Record<string, string>> {
  const db = getFirestoreInstance();
  const snapshot = await getDocs(collection(db, 'juegos'));
  const games: Record<string, string> = {};
  snapshot.forEach((doc) => { games[doc.id] = (doc.data() as { name: string }).name || 'Unknown'; });
  return games;
}

async function fetchRivalryData(currentUid: string, opponentUid: string): Promise<FilteredPartido[]> {
  const db = getFirestoreInstance();
  const q = query(collection(db, 'partidos'), where('player1Uid', 'in', [currentUid, opponentUid]));
  try {
    const snapshot = await getDocs(q);
    const partidos: FilteredPartido[] = [];
    snapshot.forEach((doc) => {
      const d = doc.data() as FirestorePartido;
      const bothPlayers =
        (d.player1Uid === currentUid && d.player2Uid === opponentUid) ||
        (d.player1Uid === opponentUid && d.player2Uid === currentUid);
      if (bothPlayers) {
        partidos.push({
          id: doc.id, gameId: d.gameId,
          player1Uid: d.player1Uid, player2Uid: d.player2Uid,
          score1: d.score1, score2: d.score2,
          winnerUid: d.winnerUid, createdAt: d.createdAt.toDate(),
        });
      }
    });
    return partidos;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rivalry data';
    throw new FirestoreError(message, 'RIVALRY_FETCH_ERROR');
  }
}

function computeStreak(partidos: FilteredPartido[], currentUid: string): H2HStreak {
  const sorted = [...partidos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (!sorted.length) return { type: null, count: 0 };
  const first = sorted[0].winnerUid === currentUid ? 'W' : 'L';
  let count = 0;
  for (const m of sorted) {
    const r = m.winnerUid === currentUid ? 'W' : 'L';
    if (r === first) count++; else break;
  }
  return { type: first, count };
}

function banterLine(wins: number, losses: number, oppName: string): string {
  const total = wins + losses;
  if (total === 0) return "You've never settled this one.";
  const dom = wins / total;
  if (dom >= 0.75) return `You own ${oppName}. Keep it humiliating.`;
  if (dom >= 0.6)  return `You've got ${oppName}'s number.`;
  if (dom <= 0.25) return `${oppName} owns you. This is embarrassing.`;
  if (dom <= 0.4)  return `${oppName} has your number. Do something.`;
  return 'Dead even. Next one settles it.';
}

export function RivalryModal({ isOpen, opponentUid, opponentName, onClose }: RivalryModalProps): React.JSX.Element | null {
  const { user } = useAuth();
  const [record, setRecord] = useState<RivalryRecord | null>(null);
  const [perGame, setPerGame] = useState<PerGameRecord[]>([]);
  const [lastMatch, setLastMatch] = useState<LastMatch | null>(null);
  const [streak, setStreak] = useState<H2HStreak>({ type: null, count: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setRecord(null); setPerGame([]); setLastMatch(null);
      setStreak({ type: null, count: 0 });
      setLoading(false); setError(null);
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user || user.uid === opponentUid) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [partidos, gameNames] = await Promise.all([
          fetchRivalryData(user.uid, opponentUid),
          fetchJuegos(),
        ]);
        if (cancelled) return;

        let wins = 0, losses = 0;
        const gameMap = new Map<string, { wins: number; losses: number }>();
        partidos.forEach((m) => {
          const youWon = m.winnerUid === user.uid;
          if (youWon) wins++; else losses++;
          if (!gameMap.has(m.gameId)) gameMap.set(m.gameId, { wins: 0, losses: 0 });
          const g = gameMap.get(m.gameId)!;
          if (youWon) g.wins++; else g.losses++;
        });

        const pgBreakdown: PerGameRecord[] = [...gameMap.entries()]
          .map(([gameId, g]) => ({
            gameId, gameName: gameNames[gameId] ?? 'Unknown',
            wins: g.wins, losses: g.losses, total: g.wins + g.losses,
          }))
          .sort((a, b) => b.total - a.total);

        const sorted = [...partidos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        let last: LastMatch | null = null;
        if (sorted.length > 0) {
          const m = sorted[0];
          const youP1 = m.player1Uid === user.uid;
          const yourScore = youP1 ? m.score1 : m.score2;
          const theirScore = youP1 ? m.score2 : m.score1;
          const diffDays = (Date.now() - m.createdAt.getTime()) / 86400000;
          const dateLabel = diffDays <= 7
            ? formatDistanceToNow(m.createdAt, { addSuffix: true })
            : format(m.createdAt, 'MMMM d, yyyy');
          last = { gameName: gameNames[m.gameId] ?? 'Unknown', yourScore, theirScore, youWon: m.winnerUid === user.uid, dateLabel };
        }

        setRecord({ wins, losses, total: wins + losses });
        setPerGame(pgBreakdown);
        setLastMatch(last);
        setStreak(computeStreak(partidos, user.uid));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rivalry data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, user, opponentUid]);

  const handleBackdrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const total = record?.total ?? 0;
  const youPct = total > 0 ? wins / total : 0.5;
  const lead = wins > losses;
  const tied = wins === losses;
  const leadCol = tied ? 'var(--text-dim)' : lead ? 'var(--win)' : 'var(--loss)';
  const displayName = opponentName.length > 25 ? `${opponentName.slice(0, 25)}…` : opponentName;

  return (
    <div className="ht-overlay" onMouseDown={handleBackdrop} role="dialog" aria-modal="true" aria-labelledby="rivalry-title">
      <div className="ht-modal">

        {/* hero section */}
        <div style={{ padding: '24px 24px 20px', position: 'relative', borderBottom: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'var(--bg-3)', border: '1px solid var(--line-strong)',
              borderRadius: 9, width: 34, height: 34,
              display: 'grid', placeItems: 'center', color: 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            <Icon name="x" style={{ width: 18, height: 18 }} />
          </button>

          <div className="ht-eyebrow ht-center" style={{ marginBottom: 18 }}>HEAD TO HEAD</div>

          <div className="ht-row" style={{ justifyContent: 'center', gap: 18, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 96 }}>
              <Avatar uid={user?.uid ?? 'you'} displayName={user?.displayName ?? 'You'} photoURL={user?.photoURL} size={64} ring glow isYou />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textAlign: 'center', lineHeight: 1 }}>
                You
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Icon name="swords" style={{ width: 26, height: 26, color: 'var(--vs)', marginBottom: 4 }} />
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
                color: 'var(--vs)', letterSpacing: '0.08em',
                textShadow: '0 0 16px var(--vs)',
              }}>
                VS
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 96 }}>
              <Avatar uid={opponentUid} displayName={displayName} size={64} ring />
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, textAlign: 'center', lineHeight: 1 }}>
                {displayName}
              </div>
            </div>
          </div>

          {/* big W-L score */}
          <div className="ht-row" style={{ justifyContent: 'center', alignItems: 'baseline', gap: 14, margin: '20px 0 6px' }}>
            <span className="ht-mono" style={{ fontWeight: 700, fontSize: 56, lineHeight: 1, color: 'var(--win)', textShadow: '0 0 20px color-mix(in srgb, var(--win) 50%, transparent)' }}>
              {wins}
            </span>
            <span className="ht-mono" style={{ fontSize: 28, color: 'var(--text-faint)' }}>–</span>
            <span className="ht-mono" style={{ fontWeight: 700, fontSize: 56, lineHeight: 1, color: 'var(--loss)', textShadow: '0 0 20px color-mix(in srgb, var(--loss) 50%, transparent)' }}>
              {losses}
            </span>
          </div>

          {/* dominance bar */}
          {total > 0 && (
            <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', margin: '14px 0', background: 'var(--loss)' }}>
              <div style={{ width: `${youPct * 100}%`, background: 'var(--win)', boxShadow: '0 0 10px color-mix(in srgb, var(--win) 60%, transparent)' }} />
            </div>
          )}

          {/* banter */}
          {!loading && (
            <div id="rivalry-title" className="ht-center" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: leadCol, lineHeight: 1.3 }}>
              {banterLine(wins, losses, displayName)}
            </div>
          )}

          {/* streak badge */}
          {streak.count >= 2 && (
            <div className="ht-center" style={{ marginTop: 12 }}>
              <span className={`ht-badge ${streak.type === 'W' ? (streak.count >= 3 ? 'ht-badge-hot' : 'ht-badge-win') : (streak.count >= 3 ? 'ht-badge-cold' : 'ht-badge-loss')}`}>
                {streak.type === 'W' ? 'YOU' : 'THEM'} {streak.count} IN A ROW
              </span>
            </div>
          )}
        </div>

        {/* body */}
        {error && (
          <div className="ht-card-pad" style={{ color: 'var(--loss)', fontSize: 13 }}>{error}</div>
        )}

        {loading ? (
          <div className="ht-card-pad ht-center ht-muted" style={{ padding: '32px 24px' }}>
            Loading rivalry stats…
          </div>
        ) : total === 0 ? (
          <div className="ht-card-pad ht-center ht-muted" style={{ padding: '32px 24px' }}>
            You've never settled this one.
          </div>
        ) : (
          <div className="ht-card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* by game */}
            {perGame.length > 0 && (
              <div>
                <div className="ht-label" style={{ marginBottom: 12 }}>By Game</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {perGame.map((g) => (
                    <div key={g.gameId} className="ht-row ht-gap12">
                      <span className="ht-grow" style={{ fontSize: 14, fontWeight: 600 }}>{g.gameName}</span>
                      <div style={{ width: 90, display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', background: 'var(--loss)' }}>
                        <div style={{ width: `${(g.wins / g.total) * 100}%`, background: 'var(--win)' }} />
                      </div>
                      <RecordPill wins={g.wins} losses={g.losses} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="ht-divider" />

            {/* last match */}
            {lastMatch && (
              <div>
                <div className="ht-label" style={{ marginBottom: 10 }}>Last Match</div>
                <div className="ht-row ht-between" style={{
                  background: 'var(--bg-2)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r)', padding: '13px 15px',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{lastMatch.gameName}</div>
                    <div className="ht-faint" style={{ fontSize: 12.5, marginTop: 2 }}>{lastMatch.dateLabel}</div>
                  </div>
                  <div className="ht-row ht-gap12" style={{ alignItems: 'center' }}>
                    <span className="ht-mono" style={{ fontSize: 20, fontWeight: 700 }}>
                      <span style={{ color: 'var(--win)' }}>{lastMatch.yourScore}</span>
                      <span style={{ color: 'var(--text-faint)', margin: '0 4px' }}>–</span>
                      <span style={{ color: 'var(--loss)' }}>{lastMatch.theirScore}</span>
                    </span>
                    <span className={`ht-badge ${lastMatch.youWon ? 'ht-badge-win' : 'ht-badge-loss'}`}>
                      {lastMatch.youWon ? 'You won' : 'They won'}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
