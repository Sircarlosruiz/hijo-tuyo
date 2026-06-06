import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  orderBy,
  query,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase-client';
import { resolvePlayerName } from '../lib/resolve-player-name';
import type { TournamentDocument, TournamentFixture, GameOption, PlayerOption } from '../types/tournament';

interface UseTournamentsResult {
  tournaments: TournamentDocument[];
  loading: boolean;
  error: string | null;
}

export function useTournaments(): UseTournamentsResult {
  const db = getFirestoreInstance();
  const [tournaments, setTournaments] = useState<TournamentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const q = query(collection(db, 'torneos'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (cancelled) return;

        setTournaments(
          snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data();
            return {
              id: d.id,
              name: (data.name as string) ?? '',
              gameId: (data.gameId as string) ?? '',
              participantUids: (data.participantUids as string[]) ?? [],
              status: (data.status as 'active' | 'complete') ?? 'active',
              fixtures: (data.fixtures as TournamentFixture[]) ?? [],
              createdByUid: (data.createdByUid as string) ?? '',
              createdAt: data.createdAt,
              completedAt: data.completedAt,
            };
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tournaments');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db]);

  return { tournaments, loading, error };
}

interface UseTournamentResult {
  tournament: TournamentDocument | null;
  loading: boolean;
  error: string | null;
}

export function useTournament(id: string): UseTournamentResult {
  const db = getFirestoreInstance();
  const [tournament, setTournament] = useState<TournamentDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const ref = doc(db, 'torneos', id);
        const snap = await getDoc(ref);
        if (cancelled) return;

        if (!snap.exists()) {
          setTournament(null);
        } else {
          const data = snap.data();
          setTournament({
            id: snap.id,
            name: (data.name as string) ?? '',
            gameId: (data.gameId as string) ?? '',
            participantUids: (data.participantUids as string[]) ?? [],
            status: (data.status as 'active' | 'complete') ?? 'active',
            fixtures: (data.fixtures as TournamentFixture[]) ?? [],
            createdByUid: (data.createdByUid as string) ?? '',
            createdAt: data.createdAt,
            completedAt: data.completedAt,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tournament');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, id]);

  return { tournament, loading, error };
}

interface UseTournamentCreateDataResult {
  games: GameOption[];
  players: PlayerOption[];
  loading: boolean;
  error: string | null;
}

export function useTournamentCreateData(): UseTournamentCreateDataResult {
  const db = getFirestoreInstance();
  const [games, setGames] = useState<GameOption[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [gamesSnap, playersSnap] = await Promise.all([
          getDocs(collection(db, 'juegos')),
          getDocs(collection(db, 'usuarios')),
        ]);
        if (cancelled) return;

        setGames(
          gamesSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
            id: d.id,
            name: (d.data().name as string) ?? 'Unknown',
            category: (d.data().category as string) ?? '',
          })),
        );
        setPlayers(
          playersSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data();
            return {
              id: d.id,
              displayName: resolvePlayerName({ nickname: data.nickname, name: data.name }),
            };
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db]);

  return { games, players, loading, error };
}

export interface TournamentPartido {
  id: string;
  gameId: string;
  player1Uid: string;
  player2Uid: string;
  score1: number;
  score2: number;
  winnerUid: string;
  recordedByUid: string;
  tournamentId?: string;
  fixtureId?: string;
}

interface UseTournamentPartidosResult {
  partidos: TournamentPartido[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTournamentPartidos(tournamentId: string): UseTournamentPartidosResult {
  const db = getFirestoreInstance();
  const [partidos, setPartidos] = useState<TournamentPartido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!tournamentId) return;

    let cancelled = false;

    void (async () => {
      try {
        const q = query(
          collection(db, 'partidos'),
          where('tournamentId', '==', tournamentId),
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        setPartidos(
          snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => {
            const data = d.data();
            return {
              id: d.id,
              gameId: (data.gameId as string) ?? '',
              player1Uid: (data.player1Uid as string) ?? '',
              player2Uid: (data.player2Uid as string) ?? '',
              score1: (data.score1 as number) ?? 0,
              score2: (data.score2 as number) ?? 0,
              winnerUid: (data.winnerUid as string) ?? '',
              recordedByUid: (data.recordedByUid as string) ?? '',
              tournamentId: data.tournamentId as string | undefined,
              fixtureId: data.fixtureId as string | undefined,
            };
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load matches');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, tournamentId, refreshKey]);

  return { partidos, loading, error, refresh };
}
