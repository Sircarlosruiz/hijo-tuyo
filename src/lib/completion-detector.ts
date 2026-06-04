import type { TournamentFixture } from '../types/tournament';
import type { StandingRow } from './standings-computer';

export interface CompletionResult {
  isComplete: boolean;
  championUid: string | null;
  championName: string | null;
  isTie: boolean;
  tiedUids: string[];
}

export function detectCompletion(
  fixtures: TournamentFixture[],
  standings: StandingRow[],
): CompletionResult {
  const allPlayed = fixtures.every((f) => f.status === 'played');

  if (!allPlayed) {
    return {
      isComplete: false,
      championUid: null,
      championName: null,
      isTie: false,
      tiedUids: [],
    };
  }

  if (standings.length === 0) {
    return {
      isComplete: true,
      championUid: null,
      championName: null,
      isTie: true,
      tiedUids: [],
    };
  }

  const maxWins = standings[0].wins;
  const leaders = standings.filter((s) => s.wins === maxWins);

  if (leaders.length === 1) {
    return {
      isComplete: true,
      championUid: leaders[0].uid,
      championName: leaders[0].displayName,
      isTie: false,
      tiedUids: [],
    };
  }

  return {
    isComplete: true,
    championUid: null,
    championName: null,
    isTie: true,
    tiedUids: leaders.map((l) => l.uid),
  };
}
