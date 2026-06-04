import { describe, it, expect } from 'vitest';
import { generateRoundRobinSchedule, expectedFixtureCount } from '../lib/schedule-generator';

describe('generateRoundRobinSchedule', () => {
  it('should return empty array for fewer than 3 participants', () => {
    expect(generateRoundRobinSchedule([])).toEqual([]);
    expect(generateRoundRobinSchedule(['a'])).toEqual([]);
    expect(generateRoundRobinSchedule(['a', 'b'])).toEqual([]);
  });

  it('should generate correct number of fixtures for 3 participants', () => {
    const fixtures = generateRoundRobinSchedule(['a', 'b', 'c']);
    expect(fixtures).toHaveLength(3); // 3*(3-1)/2 = 3
  });

  it('should generate correct number of fixtures for 4 participants', () => {
    const fixtures = generateRoundRobinSchedule(['a', 'b', 'c', 'd']);
    expect(fixtures).toHaveLength(6); // 4*3/2 = 6
  });

  it('should generate correct number of fixtures for 5 participants', () => {
    const fixtures = generateRoundRobinSchedule(['a', 'b', 'c', 'd', 'e']);
    expect(fixtures).toHaveLength(10); // 5*4/2 = 10
  });

  it('should generate unique pairs with no duplicates', () => {
    const fixtures = generateRoundRobinSchedule(['a', 'b', 'c', 'd']);
    const pairs = new Set<string>();

    for (const f of fixtures) {
      const pair = [f.player1Uid, f.player2Uid].sort().join('-');
      expect(pairs.has(pair)).toBe(false);
      pairs.add(pair);
    }

    expect(pairs.size).toBe(fixtures.length);
  });

  it('should set all fixtures to pending status', () => {
    const fixtures = generateRoundRobinSchedule(['a', 'b', 'c']);
    for (const f of fixtures) {
      expect(f.status).toBe('pending');
    }
  });

  it('should generate unique fixture IDs', () => {
    const fixtures = generateRoundRobinSchedule(['a', 'b', 'c', 'd']);
    const ids = new Set(fixtures.map((f) => f.fixtureId));
    expect(ids.size).toBe(fixtures.length);
  });

  it('should not assign matchId to any fixture', () => {
    const fixtures = generateRoundRobinSchedule(['a', 'b', 'c']);
    for (const f of fixtures) {
      expect(f.matchId).toBeUndefined();
    }
  });
});

describe('expectedFixtureCount', () => {
  it('should return 0 for 0 participants', () => {
    expect(expectedFixtureCount(0)).toBe(0);
  });

  it('should return 0 for 1 participant', () => {
    expect(expectedFixtureCount(1)).toBe(0);
  });

  it('should return 1 for 2 participants', () => {
    expect(expectedFixtureCount(2)).toBe(1);
  });

  it('should return 3 for 3 participants', () => {
    expect(expectedFixtureCount(3)).toBe(3);
  });

  it('should return 10 for 5 participants', () => {
    expect(expectedFixtureCount(5)).toBe(10);
  });

  it('should return 66 for 12 participants', () => {
    expect(expectedFixtureCount(12)).toBe(66);
  });
});
