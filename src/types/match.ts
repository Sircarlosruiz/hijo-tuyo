import type { DocumentReference } from 'firebase/firestore';

export interface Game {
  id: string;
  name: string;
  ref: DocumentReference;
}

export interface Player {
  id: string;
  displayName: string;
  ref: DocumentReference;
}

export interface MatchFormState {
  gameId: string;
  player1Uid: string;
  player2Uid: string;
  score1: string;
  score2: string;
}

export interface MatchFormErrors {
  gameId?: string;
  player1Uid?: string;
  player2Uid?: string;
  score1?: string;
  score2?: string;
  general?: string;
}

export const INITIAL_FORM_STATE: MatchFormState = {
  gameId: '',
  player1Uid: '',
  player2Uid: '',
  score1: '',
  score2: '',
};
