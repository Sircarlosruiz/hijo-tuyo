import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardChart } from '../components/leaderboard-chart';
import type { PlayerStats } from '../types/dashboard';

describe('LeaderboardChart', () => {
  it('should show empty state when no data', () => {
    render(<LeaderboardChart data={[]} />);
    expect(screen.getByText('No matches recorded yet.')).toBeTruthy();
    expect(
      screen.getByText('Play some matches to see the leaderboard!'),
    ).toBeTruthy();
  });

  it('should render chart container when data is provided', () => {
    const mockData: PlayerStats[] = [
      { uid: '1', displayName: 'Alice', wins: 5, losses: 2, winRate: 0.714 },
      { uid: '2', displayName: 'Bob', wins: 3, losses: 4, winRate: 0.428 },
    ];

    const { container } = render(<LeaderboardChart data={mockData} />);
    expect(container.querySelector('div[style]')).toBeTruthy();
  });

  it('should not show empty state when data is provided', () => {
    const mockData: PlayerStats[] = [
      { uid: '1', displayName: 'Alice', wins: 5, losses: 2, winRate: 0.714 },
    ];

    render(<LeaderboardChart data={mockData} />);
    expect(screen.queryByText('No matches recorded yet.')).toBeNull();
  });
});
