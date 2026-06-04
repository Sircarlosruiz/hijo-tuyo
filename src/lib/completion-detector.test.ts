import { describe, it, expect } from 'vitest';
import { detectCompletion } from '../lib/completion-detector';
import type { StandingRow } from '../lib/standings-computer';

describe('detectCompletion', () => {
  const createStanding = (uid: string, name: string, wins: number): StandingRow => ({
    uid,
    displayName: name,
    wins,
    losses: 0,
    rank: 1,
    tieFlag: false,
  });

  it('should return not complete when fixtures are pending', () => {
    const fixtures = [
      { fixtureId: '1', player1Uid: 'a', player2Uid: 'b', status: 'played' as const },
      { fixtureId: '2', player1Uid: 'a', player2Uid: 'c', status: 'pending' as const },
    ];
    const standings = [createStanding('a', 'Alice', 1)];

    const result = detectCompletion(fixtures, standings);

    expect(result.isComplete).toBe(false);
    expect(result.championUid).toBeNull();
  });

  it('should return champion when one participant has most wins', () => {
    const fixtures = [
      { fixtureId: '1', player1Uid: 'a', player2Uid: 'b', status: 'played' as const },
      { fixtureId: '2', player1Uid: 'a', player2Uid: 'c', status: 'played' as const },
      { fixtureId: '3', player1Uid: 'b', player2Uid: 'c', status: 'played' as const },
    ];
    const standings = [
      createStanding('a', 'Alice', 2),
      createStanding('b', 'Bob', 1),
      createStanding('c', 'Carol', 0),
    ];

    const result = detectCompletion(fixtures, standings);

    expect(result.isComplete).toBe(true);
    expect(result.championUid).toBe('a');
    expect(result.championName).toBe('Alice');
    expect(result.isTie).toBe(false);
  });

  it('should detect tie when multiple participants have same max wins', () => {
    const fixtures = [
      { fixtureId: '1', player1Uid: 'a', player2Uid: 'b', status: 'played' as const },
    ];
    const standings = [
      createStanding('a', 'Alice', 1),
      createStanding('b', 'Bob', 1),
    ];

    const result = detectCompletion(fixtures, standings);

    expect(result.isComplete).toBe(true);
    expect(result.isTie).toBe(true);
    expect(result.tiedUids).toContain('a');
    expect(result.tiedUids).toContain('b');
  });

  it('should handle empty standings', () => {
    const fixtures = [
      { fixtureId: '1', player1Uid: 'a', player2Uid: 'b', status: 'played' as const },
    ];

    const result = detectCompletion(fixtures, []);

    expect(result.isComplete).toBe(true);
    expect(result.isTie).toBe(true);
  });
});
