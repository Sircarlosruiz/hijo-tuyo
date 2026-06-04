import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityFeed } from '../components/activity-feed';
import type { MatchRecord } from '../types/dashboard';

describe('ActivityFeed', () => {
  const mockActivities: MatchRecord[] = [
    {
      id: '1',
      gameId: '1',
      gameName: 'FIFA',
      player1Uid: 'u1',
      player1Name: 'Alice',
      player2Uid: 'u2',
      player2Name: 'Bob',
      score1: 3,
      score2: 1,
      winnerUid: 'u1',
      winnerName: 'Alice',
      timestamp: new Date(Date.now() - 3600000),
    },
  ];

  it('should show loading state', () => {
    render(<ActivityFeed activities={[]} loading={true} />);
    expect(screen.getByText('Loading activity...')).toBeTruthy();
  });

  it('should show empty state when no activities', () => {
    render(<ActivityFeed activities={[]} loading={false} />);
    expect(screen.getByText('No recent activity.')).toBeTruthy();
  });

  it('should render match details', () => {
    render(<ActivityFeed activities={mockActivities} loading={false} />);
    expect(screen.getByText('FIFA')).toBeTruthy();
    expect(screen.getByText(/Alice 3 - 1 Bob/)).toBeTruthy();
    expect(screen.getByText(/Winner: Alice/)).toBeTruthy();
  });
});
