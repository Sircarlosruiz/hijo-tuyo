import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/use-auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase-client';
import { FirestoreError } from '../types/dashboard';
import { formatDistanceToNow, format } from 'date-fns';

interface RivalryModalProps {
  isOpen: boolean;
  opponentUid: string;
  opponentName: string;
  onClose: () => void;
}

interface RivalryRecord {
  wins: number;
  losses: number;
  total: number;
}

interface PerGameRecord {
  gameId: string;
  gameName: string;
  wins: number;
  losses: number;
  total: number;
}

interface MostRecentMatch {
  gameId: string;
  gameName: string;
  winnerUid: string;
  date: Date;
  dateLabel: string;
  winnerLabel: string;
}

interface RivalryData {
  record: RivalryRecord;
  partidos: FilteredPartido[];
}

interface FilteredPartido {
  id: string;
  gameId: string;
  player1Uid: string;
  player2Uid: string;
  score1: number;
  score2: number;
  winnerUid: string;
  createdAt: Date;
}

interface FirestorePartido {
  gameId: string;
  player1Uid: string;
  player2Uid: string;
  score1: number;
  score2: number;
  winnerUid: string;
  createdAt: { toDate: () => Date };
}

interface FirestoreJuego {
  name: string;
  category: string;
}

async function fetchJuegos(): Promise<Record<string, string>> {
  const db = getFirestoreInstance();
  const snapshot = await getDocs(collection(db, 'juegos'));

  const games: Record<string, string> = {};
  snapshot.forEach((doc) => {
    const data = doc.data() as FirestoreJuego;
    games[doc.id] = data.name || 'Unknown Game';
  });

  return games;
}

async function fetchRivalryData(
  currentUid: string,
  opponentUid: string,
): Promise<RivalryData> {
  const db = getFirestoreInstance();

  const q = query(
    collection(db, 'partidos'),
    where('player1Uid', 'in', [currentUid, opponentUid]),
  );

  try {
    const snapshot = await getDocs(q);
    const partidos: FilteredPartido[] = [];
    let wins = 0;
    let losses = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() as FirestorePartido;
      const involvesBothPlayers =
        (data.player1Uid === currentUid && data.player2Uid === opponentUid) ||
        (data.player1Uid === opponentUid && data.player2Uid === currentUid);

      if (involvesBothPlayers) {
        const filtered: FilteredPartido = {
          id: doc.id,
          gameId: data.gameId,
          player1Uid: data.player1Uid,
          player2Uid: data.player2Uid,
          score1: data.score1,
          score2: data.score2,
          winnerUid: data.winnerUid,
          createdAt: data.createdAt.toDate(),
        };
        partidos.push(filtered);

        if (data.winnerUid === currentUid) {
          wins += 1;
        } else {
          losses += 1;
        }
      }
    });

    return {
      record: { wins, losses, total: wins + losses },
      partidos,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rivalry data';
    console.error('Failed to fetch rivalry data', { currentUid, opponentUid, error: message });
    throw new FirestoreError(message, 'RIVALRY_FETCH_ERROR');
  }
}

function computePerGameBreakdown(
  partidos: FilteredPartido[],
  currentUid: string,
  gameNames: Record<string, string>,
): PerGameRecord[] {
  const gameMap = new Map<string, { wins: number; losses: number }>();

  for (const partido of partidos) {
    const { gameId, winnerUid } = partido;

    if (!gameMap.has(gameId)) {
      gameMap.set(gameId, { wins: 0, losses: 0 });
    }

    const gameStats = gameMap.get(gameId)!;
    if (winnerUid === currentUid) {
      gameStats.wins += 1;
    } else {
      gameStats.losses += 1;
    }
  }

  const breakdown: PerGameRecord[] = [];
  for (const [gameId, { wins, losses }] of gameMap.entries()) {
    breakdown.push({
      gameId,
      gameName: gameNames[gameId] || 'Unknown Game',
      wins,
      losses,
      total: wins + losses,
    });
  }

  return breakdown.sort((a, b) => b.total - a.total);
}

function computeMostRecentMatch(
  partidos: FilteredPartido[],
  currentUid: string,
  opponentName: string,
  gameNames: Record<string, string>,
): MostRecentMatch | null {
  if (partidos.length === 0) {
    return null;
  }

  const sorted = [...partidos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const latest = sorted[0];

  const now = new Date();
  const diffDays = (now.getTime() - latest.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const dateLabel = diffDays <= 7
    ? formatDistanceToNow(latest.createdAt, { addSuffix: true })
    : format(latest.createdAt, 'MMMM d, yyyy');

  const winnerLabel = latest.winnerUid === currentUid
    ? 'You won'
    : `${opponentName || 'Opponent'} won`;

  return {
    gameId: latest.gameId,
    gameName: gameNames[latest.gameId] || 'Unknown Game',
    winnerUid: latest.winnerUid,
    date: latest.createdAt,
    dateLabel,
    winnerLabel,
  };
}

export function RivalryModal({
  isOpen,
  opponentUid,
  opponentName,
  onClose,
}: RivalryModalProps): React.JSX.Element | null {
  const { user } = useAuth();
  const [record, setRecord] = useState<RivalryRecord | null>(null);
  const [perGameBreakdown, setPerGameBreakdown] = useState<PerGameRecord[]>([]);
  const [mostRecentMatch, setMostRecentMatch] = useState<MostRecentMatch | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isSelfRivalry = user?.uid === opponentUid;

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;

      const handleEscape = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setRecord(null);
      setPerGameBreakdown([]);
      setMostRecentMatch(null);
      setLoading(false);
      setError(null);
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user || isSelfRivalry) {
      return;
    }

    let cancelled = false;

    async function loadRivalry(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const [rivalryData, gameNames] = await Promise.all([
          fetchRivalryData(user.uid, opponentUid),
          fetchJuegos(),
        ]);

        if (!cancelled) {
          setRecord(rivalryData.record);
          setPerGameBreakdown(
            computePerGameBreakdown(rivalryData.partidos, user.uid, gameNames),
          );
          setMostRecentMatch(
            computeMostRecentMatch(rivalryData.partidos, user.uid, opponentName, gameNames),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load rivalry data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRivalry();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user, opponentUid, opponentName, isSelfRivalry]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) {
    return null;
  }

  const displayName = opponentName || 'Unknown Player';
  const truncatedName = displayName.length > 25 ? `${displayName.slice(0, 25)}...` : displayName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rivalry-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2
          id="rivalry-modal-title"
          className="mb-4 text-xl font-semibold text-gray-900"
        >
          You vs. {truncatedName}
        </h2>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-gray-500">
            <p>Loading rivalry stats...</p>
          </div>
        ) : isSelfRivalry || (record && record.total === 0) ? (
          <div className="py-8 text-center text-gray-500">
            <p>No matches yet between you two</p>
          </div>
        ) : record ? (
          <div className="space-y-6">
            <div className="flex justify-between rounded-lg bg-gray-50 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{record.wins}</div>
                <div className="text-sm text-gray-600">Your wins</div>
              </div>
              <div className="flex items-center text-gray-400">—</div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{record.losses}</div>
                <div className="text-sm text-gray-600">Their wins</div>
              </div>
            </div>

            {perGameBreakdown.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">By Game</h3>
                <div className="space-y-1">
                  {perGameBreakdown.map((game) => (
                    <div
                      key={game.gameId}
                      className="flex items-center justify-between rounded px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-gray-800">{game.gameName}</span>
                      <span className="text-gray-600">
                        <span className="text-green-600">{game.wins}</span>
                        {' — '}
                        <span className="text-red-600">{game.losses}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mostRecentMatch && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Last Match</h3>
                <div className="rounded bg-gray-50 px-3 py-3 text-sm">
                  <div className="font-medium text-gray-800">{mostRecentMatch.gameName}</div>
                  <div className="text-gray-600">
                    {mostRecentMatch.winnerLabel} · {mostRecentMatch.dateLabel}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
