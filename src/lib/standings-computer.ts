import type { TournamentFixture } from '../types/tournament';

export interface StandingRow {
  uid: string;
  displayName: string;
  wins: number;
  losses: number;
  rank: number;
  tieFlag: boolean;
}

export interface TournamentPartido {
  player1Uid: string;
  player2Uid: string;
  winnerUid: string;
  tournamentId?: string;
  fixtureId?: string;
}

interface MatchResult {
  winner: string;
  loser: string;
}

function getHeadToHeadWins(
  uid1: string,
  uid2: string,
  results: MatchResult[],
): number {
  return results.filter(
    (r) => r.winner === uid1 && r.loser === uid2,
  ).length;
}

function hasPendingFixtureBetween(
  uid1: string,
  uid2: string,
  fixtures: TournamentFixture[],
): boolean {
  return fixtures.some(
    (f) =>
      f.status === 'pending' &&
      ((f.player1Uid === uid1 && f.player2Uid === uid2) ||
        (f.player1Uid === uid2 && f.player2Uid === uid1)),
  );
}

export function computeStandings(
  participantUids: string[],
  playerNames: Map<string, string>,
  fixtures: TournamentFixture[],
  partidos: TournamentPartido[],
): StandingRow[] {
  const results: MatchResult[] = partidos
    .filter((p) => p.winnerUid)
    .map((p) => ({
      winner: p.winnerUid,
      loser: p.player1Uid === p.winnerUid ? p.player2Uid : p.player1Uid,
    }));

  const winMap = new Map<string, number>();
  const lossMap = new Map<string, number>();

  for (const uid of participantUids) {
    winMap.set(uid, 0);
    lossMap.set(uid, 0);
  }

  for (const r of results) {
    winMap.set(r.winner, (winMap.get(r.winner) ?? 0) + 1);
    lossMap.set(r.loser, (lossMap.get(r.loser) ?? 0) + 1);
  }

  const rows: StandingRow[] = participantUids.map((uid) => ({
    uid,
    displayName: playerNames.get(uid) ?? 'Unknown',
    wins: winMap.get(uid) ?? 0,
    losses: lossMap.get(uid) ?? 0,
    rank: 0,
    tieFlag: false,
  }));

  rows.sort((a, b) => {
    if (a.wins !== b.wins) return b.wins - a.wins;

    const aBeatsB = getHeadToHeadWins(a.uid, b.uid, results);
    const bBeatsA = getHeadToHeadWins(b.uid, a.uid, results);

    if (aBeatsB > bBeatsA) return -1;
    if (bBeatsA > aBeatsB) return 1;

    if (hasPendingFixtureBetween(a.uid, b.uid, fixtures)) return 0;

    return 0;
  });

  let rank = 1;
  let i = 0;

  while (i < rows.length) {
    let j = i;

    while (j + 1 < rows.length) {
      const next = rows[j + 1];
      const current = rows[i];

      if (next.wins !== current.wins) break;

      const aBeatsB = getHeadToHeadWins(current.uid, next.uid, results);
      const bBeatsA = getHeadToHeadWins(next.uid, current.uid, results);

      if (aBeatsB > bBeatsA) break;
      if (bBeatsA > aBeatsB) break;

      j++;
    }

    const tieGroup = rows.slice(i, j + 1);

    if (tieGroup.length === 1) {
      tieGroup[0].rank = rank;
      tieGroup[0].tieFlag = false;
    } else if (tieGroup.length === 2) {
      const [a, b] = tieGroup;
      const aBeatsB = getHeadToHeadWins(a.uid, b.uid, results);
      const bBeatsA = getHeadToHeadWins(b.uid, a.uid, results);

      if (aBeatsB === bBeatsA) {
        a.rank = rank;
        b.rank = rank;
        a.tieFlag = true;
        b.tieFlag = true;
      } else {
        a.rank = rank;
        a.tieFlag = false;
        b.rank = rank + 1;
        b.tieFlag = false;
      }
    } else {
      for (const row of tieGroup) {
        row.rank = rank;
        row.tieFlag = true;
      }
    }

    i = j + 1;
    rank = i + 1;
  }

  return rows;
}
