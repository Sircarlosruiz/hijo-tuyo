import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameFilter } from '../components/game-filter';
import type { Game } from '../types/match';

describe('GameFilter', () => {
  const mockGames: Game[] = [
    { id: '1', name: 'FIFA', category: 'Sports', ref: {} as Game['ref'] },
    { id: '2', name: 'NBA 2K', category: 'Sports', ref: {} as Game['ref'] },
  ];

  it('should render with "All Games" default option', () => {
    render(
      <GameFilter
        games={mockGames}
        selectedGameId={null}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('All Games')).toBeTruthy();
  });

  it('should render game options from props', () => {
    render(
      <GameFilter
        games={mockGames}
        selectedGameId={null}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('FIFA')).toBeTruthy();
    expect(screen.getByText('NBA 2K')).toBeTruthy();
  });

  it('should show selected game when provided', () => {
    render(
      <GameFilter
        games={mockGames}
        selectedGameId="1"
        onChange={() => {}}
      />,
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('1');
  });
});
