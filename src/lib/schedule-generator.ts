import type { TournamentFixture } from '../types/tournament';

function generateFixtureId(): string {
  return crypto.randomUUID();
}

export function generateRoundRobinSchedule(participantUids: string[]): TournamentFixture[] {
  if (participantUids.length < 3) {
    return [];
  }

  const fixtures: TournamentFixture[] = [];

  for (let i = 0; i < participantUids.length; i++) {
    for (let j = i + 1; j < participantUids.length; j++) {
      fixtures.push({
        fixtureId: generateFixtureId(),
        player1Uid: participantUids[i],
        player2Uid: participantUids[j],
        status: 'pending',
      });
    }
  }

  return fixtures;
}

export function expectedFixtureCount(participantCount: number): number {
  if (participantCount < 2) return 0;
  return (participantCount * (participantCount - 1)) / 2;
}
