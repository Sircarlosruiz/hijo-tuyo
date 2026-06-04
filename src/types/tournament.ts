import type { Timestamp } from 'firebase/firestore';

export interface TournamentFixture {
  fixtureId: string;
  player1Uid: string;
  player2Uid: string;
  status: 'pending' | 'played';
  matchId?: string;
}

export interface TournamentDocument {
  id: string;
  name: string;
  gameId: string;
  participantUids: string[];
  status: 'active' | 'complete';
  fixtures: TournamentFixture[];
  createdByUid: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface TournamentFormData {
  name: string;
  gameId: string;
  participantUids: string[];
}

export interface TournamentFormErrors {
  name?: string;
  gameId?: string;
  participants?: string;
  general?: string;
}

export interface GameOption {
  id: string;
  name: string;
  category: string;
}

export interface PlayerOption {
  id: string;
  displayName: string;
}
