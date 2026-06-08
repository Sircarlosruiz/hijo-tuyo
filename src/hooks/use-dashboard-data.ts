import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { getFirestoreInstance } from '../lib/firebase-client';
import { resolvePlayerName } from '../lib/resolve-player-name';
import {
  type DashboardData,
  type PlayerStats,
  type MatchRecord,
  FirestoreError,
} from '../types/dashboard';
import type { Game } from '../types/match';

interface FirestorePartido {
  gameId: string;
  player1Uid: string;
  player2Uid: string;
  score1: number;
  score2: number;
  winnerUid: string;
  createdAt: { toDate: () => Date };
}

interface FirestoreUsuario {
  name: string | null;
  nickname: string | null;
}

interface FirestoreJuego {
  name: string;
  category: string;
}

function computePlayerStats(
  partidos: FirestorePartido[],
  usuarios: Record<string, FirestoreUsuario>,
): PlayerStats[] {
  const statsMap = new Map<string, { wins: number; losses: number }>();

  for (const partido of partidos) {
    const { player1Uid, player2Uid, winnerUid } = partido;

    if (!statsMap.has(player1Uid)) {
      statsMap.set(player1Uid, { wins: 0, losses: 0 });
    }
    if (!statsMap.has(player2Uid)) {
      statsMap.set(player2Uid, { wins: 0, losses: 0 });
    }

    if (winnerUid === player1Uid) {
      statsMap.get(player1Uid)!.wins += 1;
      statsMap.get(player2Uid)!.losses += 1;
    } else {
      statsMap.get(player2Uid)!.wins += 1;
      statsMap.get(player1Uid)!.losses += 1;
    }
  }

  const stats: PlayerStats[] = [];

  for (const [uid, { wins, losses }] of statsMap.entries()) {
    const total = wins + losses;
    const userData = usuarios[uid];
    const displayName = userData ? resolvePlayerName(userData) : 'Unknown';
    stats.push({
      uid,
      displayName,
      wins,
      losses,
      winRate: total > 0 ? wins / total : 0,
    });
  }

  return stats.sort((a, b) => b.wins - a.wins);
}

function mapMatchRecord(
  docId: string,
  partido: FirestorePartido,
  usuarios: Record<string, FirestoreUsuario>,
  juegos: Record<string, FirestoreJuego>,
): MatchRecord {
  const getPlayerName = (uid: string): string => {
    const user = usuarios[uid];
    return user ? resolvePlayerName(user) : 'Unknown';
  };

  return {
    id: docId,
    gameId: partido.gameId,
    gameName: juegos[partido.gameId]?.name ?? 'Unknown',
    player1Uid: partido.player1Uid,
    player1Name: getPlayerName(partido.player1Uid),
    player2Uid: partido.player2Uid,
    player2Name: getPlayerName(partido.player2Uid),
    score1: partido.score1,
    score2: partido.score2,
    winnerUid: partido.winnerUid,
    winnerName: getPlayerName(partido.winnerUid),
    timestamp: partido.createdAt.toDate(),
  };
}

export function useDashboardData(
  groupId?: string,
): DashboardData & {
  games: Game[];
  filterByGame: (gameId: string | null) => PlayerStats[];
} {
  const [partidos, setPartidos] = useState<FirestorePartido[]>([]);
  const [usuarios, setUsuarios] = useState<Record<string, FirestoreUsuario>>({});
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!groupId) {
      setPartidos([]);
      setUsuarios({});
      setGames([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const db = getFirestoreInstance();

      const partidosQuery = query(
        collection(db, 'partidos'),
        where('groupId', '==', groupId),
      );

      const [partidosSnap, usuariosSnap, juegosSnap] = await Promise.all([
        getDocs(partidosQuery),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'juegos')),
      ]);

      const usuariosMap: Record<string, FirestoreUsuario> = {};
      usuariosSnap.forEach((doc) => {
        usuariosMap[doc.id] = doc.data() as FirestoreUsuario;
      });
      setUsuarios(usuariosMap);

      const juegosList: Game[] = [];
      juegosSnap.forEach((doc) => {
        const data = doc.data() as FirestoreJuego;
        juegosList.push({
          id: doc.id,
          name: data.name,
          category: data.category ?? '',
          ref: doc.ref,
        });
      });
      setGames(juegosList);

      const partidosData: FirestorePartido[] = [];
      partidosSnap.forEach((doc) => {
        partidosData.push(doc.data() as FirestorePartido);
      });
      setPartidos(partidosData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      console.error('Failed to fetch dashboard data', { error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filterByGame = useCallback(
    (gameId: string | null): PlayerStats[] => {
      const filtered = gameId
        ? partidos.filter((p) => p.gameId === gameId)
        : partidos;
      return computePlayerStats(filtered, usuarios);
    },
    [partidos, usuarios],
  );

  const playerStats = useMemo(
    () => computePlayerStats(partidos, usuarios),
    [partidos, usuarios],
  );

  return { playerStats, loading, error, games, filterByGame };
}

export function useRecentActivity(
  limit: number = 10,
  groupId?: string,
): {
  activities: MatchRecord[];
  loading: boolean;
  error: string | null;
} {
  const [activities, setActivities] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!groupId) {
      setActivities([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const db = getFirestoreInstance();

      const partidosQuery = query(
        collection(db, 'partidos'),
        where('groupId', '==', groupId),
        orderBy('createdAt', 'desc'),
      );

      const [partidosSnap, usuariosSnap, juegosSnap] = await Promise.all([
        getDocs(partidosQuery),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'juegos')),
      ]);

      const usuariosMap: Record<string, FirestoreUsuario> = {};
      usuariosSnap.forEach((doc) => {
        usuariosMap[doc.id] = doc.data() as FirestoreUsuario;
      });

      const juegosMap: Record<string, FirestoreJuego> = {};
      juegosSnap.forEach((doc) => {
        juegosMap[doc.id] = doc.data() as FirestoreJuego;
      });

      const recentActivities: MatchRecord[] = [];
      let count = 0;

      partidosSnap.forEach((doc) => {
        if (count >= limit) return;
        const data = doc.data() as FirestorePartido;
        recentActivities.push(mapMatchRecord(doc.id, data, usuariosMap, juegosMap));
        count += 1;
      });

      setActivities(recentActivities);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch recent activity';
      console.error('Failed to fetch recent activity', { error: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [groupId, limit]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { activities, loading, error };
}
