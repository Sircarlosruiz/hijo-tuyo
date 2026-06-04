import { describe, it, expect } from 'vitest';
import { computeStandings } from '../lib/standings-computer';
import type { TournamentFixture, TournamentPartido } from '../lib/standings-computer';

describe('computeStandings', () => {
  const createFixture = (p1: string, p2: string, status: 'pending' | 'played' = 'pending'): TournamentFixture => ({
    fixtureId: `f-${p1}-${p2}`,
    player1Uid: p1,
    player2Uid: p2,
    status,
  });

  const createPartido = (p1: string, p2: string, winner: string): TournamentPartido => ({
    player1Uid: p1,
    player2Uid: p2,
    winnerUid: winner,
  });

  it('should return rows for all participants with zero wins/losses when no partidos', () => {
    const participants = ['a', 'b', 'c'];
    const names = new Map([['a', 'Alice'], ['b', 'Bob'], ['c', 'Carol']]);
    const fixtures = participants.flatMap((p1, i) =>
      participants.slice(i + 1).map((p2) => createFixture(p1, p2)),
    );

    const standings = computeStandings(participants, names, fixtures, []);

    expect(standings).toHaveLength(3);
    standings.forEach((s) => {
      expect(s.wins).toBe(0);
      expect(s.losses).toBe(0);
    });
    expect(standings[0].tieFlag).toBe(true);
    expect(standings[1].tieFlag).toBe(true);
    expect(standings[2].tieFlag).toBe(true);
  });

  it('should rank by wins descending', () => {
    const participants = ['a', 'b', 'c'];
    const names = new Map([['a', 'Alice'], ['b', 'Bob'], ['c', 'Carol']]);
    const fixtures = [
      createFixture('a', 'b', 'played'),
      createFixture('a', 'c', 'played'),
      createFixture('b', 'c', 'played'),
    ];
    const partidos = [
      createPartido('a', 'b', 'a'),
      createPartido('a', 'c', 'a'),
      createPartido('b', 'c', 'b'),
    ];

    const standings = computeStandings(participants, names, fixtures, partidos);

    expect(standings[0].uid).toBe('a');
    expect(standings[0].wins).toBe(2);
    expect(standings[1].uid).toBe('b');
    expect(standings[1].wins).toBe(1);
    expect(standings[2].uid).toBe('c');
    expect(standings[2].wins).toBe(0);
  });

  it('should resolve 2-way tie with head-to-head', () => {
    const participants = ['a', 'b', 'c'];
    const names = new Map([['a', 'Alice'], ['b', 'Bob'], ['c', 'Carol']]);
    const fixtures = [
      createFixture('a', 'b', 'played'),
      createFixture('a', 'c', 'played'),
      createFixture('b', 'c', 'played'),
    ];
    const partidos = [
      createPartido('a', 'b', 'a'),
      createPartido('a', 'c', 'c'),
      createPartido('b', 'c', 'b'),
    ];

    const standings = computeStandings(participants, names, fixtures, partidos);

    expect(standings[0].uid).toBe('a');
    expect(standings[0].wins).toBe(1);
    expect(standings[0].tieFlag).toBe(false);

    expect(standings[1].uid).toBe('b');
    expect(standings[1].wins).toBe(1);

    expect(standings[2].uid).toBe('c');
    expect(standings[2].wins).toBe(1);
  });

  it('should flag unresolved ties', () => {
    const participants = ['a', 'b'];
    const names = new Map([['a', 'Alice'], ['b', 'Bob']]);
    const fixtures = [
      createFixture('a', 'b', 'played'),
    ];
    const partidos = [
      createPartido('a', 'b', 'a'),
      createPartido('a', 'b', 'b'),
    ];

    const standings = computeStandings(participants, names, fixtures, partidos);

    expect(standings[0].wins).toBe(1);
    expect(standings[1].wins).toBe(1);
    expect(standings[0].tieFlag).toBe(true);
    expect(standings[1].tieFlag).toBe(true);
  });

  it('should assign correct rank numbers', () => {
    const participants = ['a', 'b', 'c', 'd'];
    const names = new Map([['a', 'Alice'], ['b', 'Bob'], ['c', 'Carol'], ['d', 'Dave']]);
    const fixtures = participants.flatMap((p1, i) =>
      participants.slice(i + 1).map((p2) => createFixture(p1, p2, 'played')),
    );
    const partidos = [
      createPartido('a', 'b', 'a'),
      createPartido('a', 'c', 'a'),
      createPartido('a', 'd', 'a'),
      createPartido('b', 'c', 'b'),
      createPartido('b', 'd', 'b'),
      createPartido('c', 'd', 'c'),
    ];

    const standings = computeStandings(participants, names, fixtures, partidos);

    expect(standings[0].rank).toBe(1);
    expect(standings[1].rank).toBe(2);
    expect(standings[2].rank).toBe(3);
    expect(standings[3].rank).toBe(4);
  });
});
