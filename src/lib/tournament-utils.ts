import type { TournamentFixture } from '../types/tournament';

export function getFixturePlayerUids(fixture: TournamentFixture): string[] {
  return [fixture.player1Uid, fixture.player2Uid];
}

export function getPendingFixtures(fixtures: TournamentFixture[]): TournamentFixture[] {
  return fixtures.filter((f) => f.status === 'pending');
}

export function getPlayedFixtures(fixtures: TournamentFixture[]): TournamentFixture[] {
  return fixtures.filter((f) => f.status === 'played');
}

export function isTournamentComplete(fixtures: TournamentFixture[]): boolean {
  return fixtures.every((f) => f.status === 'played');
}

export function getFixtureById(
  fixtures: TournamentFixture[],
  fixtureId: string,
): TournamentFixture | undefined {
  return fixtures.find((f) => f.fixtureId === fixtureId);
}
