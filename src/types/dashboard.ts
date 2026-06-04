export interface PlayerStats {
  uid: string;
  displayName: string;
  wins: number;
  losses: number;
  winRate: number;
}

export interface MatchRecord {
  id: string;
  gameId: string;
  gameName: string;
  player1Uid: string;
  player1Name: string;
  player2Uid: string;
  player2Name: string;
  score1: number;
  score2: number;
  winnerUid: string;
  winnerName: string;
  timestamp: Date;
}

export interface DashboardData {
  playerStats: PlayerStats[];
  loading: boolean;
  error: string | null;
}

export class FirestoreError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'FirestoreError';
  }
}
