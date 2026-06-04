import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RivalryModal } from './rivalry-modal';
import { useAuth } from '../hooks/use-auth';
import { getDocs } from 'firebase/firestore';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn().mockReturnValue({}),
    query: vi.fn().mockReturnValue({}),
    where: vi.fn().mockReturnValue({}),
    getDocs: vi.fn(),
  };
});

vi.mock('../lib/firebase-client', () => ({
  getFirestoreInstance: vi.fn().mockReturnValue({}),
}));

vi.mock('../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

const mockJuegosSnapshot = {
  forEach: (cb: (doc: { id: string; data: () => { name: string; category: string } }) => void) => {
    cb({ id: 'game-1', data: () => ({ name: 'Tennis', category: 'Racquet' }) });
    cb({ id: 'game-2', data: () => ({ name: 'Chess', category: 'Board' }) });
  },
};

const mockPartidosSnapshot = (matches: Array<{
  player1Uid: string;
  player2Uid: string;
  winnerUid: string;
  gameId: string;
  createdAt: Date;
}>) => ({
  forEach: (cb: (doc: { id: string; data: () => {
    player1Uid: string;
    player2Uid: string;
    winnerUid: string;
    gameId: string;
    score1: number;
    score2: number;
    createdAt: { toDate: () => Date };
  } }) => void) => {
    matches.forEach((m, i) => {
      cb({
        id: `match-${i}`,
        data: () => ({
          player1Uid: m.player1Uid,
          player2Uid: m.player2Uid,
          winnerUid: m.winnerUid,
          gameId: m.gameId,
          score1: 1,
          score2: 0,
          createdAt: { toDate: () => m.createdAt },
        }),
      });
    });
  },
});

describe('RivalryModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
  });

  it('should not render when isOpen is false', () => {
    render(
      <RivalryModal
        isOpen={false}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render modal with correct header when open', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('You vs. Alice')).toBeTruthy();
  });

  it('should show loading state initially', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText('Loading rivalry stats...')).toBeTruthy();
  });

  it('should show empty state when clicking own row', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="current-user"
        opponentName="Me"
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText('No matches yet between you two')).toBeTruthy();
  });

  it('should show empty state when no matches exist', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ forEach: vi.fn() } as never)
      .mockResolvedValueOnce(mockJuegosSnapshot as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No matches yet between you two')).toBeTruthy();
    });
  });

  it('should display win/loss counts when matches exist', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mockPartidosSnapshot([
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'current-user', gameId: 'game-1', createdAt: new Date('2026-06-01') },
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'opponent-1', gameId: 'game-1', createdAt: new Date('2026-06-02') },
        { player1Uid: 'opponent-1', player2Uid: 'current-user', winnerUid: 'current-user', gameId: 'game-2', createdAt: new Date('2026-06-03') },
      ]) as never)
      .mockResolvedValueOnce(mockJuegosSnapshot as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Your wins')).toBeTruthy();
      expect(screen.getByText('Their wins')).toBeTruthy();
    });
  });

  it('should display per-game breakdown', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mockPartidosSnapshot([
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'current-user', gameId: 'game-1', createdAt: new Date('2026-06-01') },
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'opponent-1', gameId: 'game-1', createdAt: new Date('2026-06-02') },
        { player1Uid: 'opponent-1', player2Uid: 'current-user', winnerUid: 'current-user', gameId: 'game-2', createdAt: new Date('2026-06-03') },
      ]) as never)
      .mockResolvedValueOnce(mockJuegosSnapshot as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('By Game')).toBeTruthy();
      expect(screen.getByText('Tennis')).toBeTruthy();
    });
  });

  it('should display most recent match section', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mockPartidosSnapshot([
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'current-user', gameId: 'game-1', createdAt: new Date('2026-06-01') },
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'opponent-1', gameId: 'game-1', createdAt: new Date('2026-06-03') },
      ]) as never)
      .mockResolvedValueOnce(mockJuegosSnapshot as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Last Match')).toBeTruthy();
    });
  });

  it('should show "You won" when current user is winner', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mockPartidosSnapshot([
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'current-user', gameId: 'game-1', createdAt: new Date('2026-06-03') },
      ]) as never)
      .mockResolvedValueOnce(mockJuegosSnapshot as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      const lastMatchSection = screen.getByText('Last Match').parentElement;
      expect(lastMatchSection?.textContent).toContain('You won');
    });
  });

  it('should show "{opponent} won" when opponent is winner', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mockPartidosSnapshot([
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'opponent-1', gameId: 'game-1', createdAt: new Date('2026-06-03') },
      ]) as never)
      .mockResolvedValueOnce(mockJuegosSnapshot as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      const lastMatchSection = screen.getByText('Last Match').parentElement;
      expect(lastMatchSection?.textContent).toContain('Alice won');
    });
  });

  it('should show "Unknown Game" when game doc is missing', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mockPartidosSnapshot([
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'current-user', gameId: 'unknown-game', createdAt: new Date('2026-06-03') },
      ]) as never)
      .mockResolvedValueOnce({ forEach: vi.fn() } as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      const unknownGames = screen.getAllByText('Unknown Game');
      expect(unknownGames.length).toBeGreaterThan(0);
    });
  });

  it('should call onClose when Close button is clicked', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should have aria-modal attribute set to true', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);

    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('should truncate long opponent names', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);

    const longName = 'This is a very long opponent name that should be truncated';
    render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName={longName}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText('You vs. This is a very long oppon...')).toBeTruthy();
  });

  it('should reset state when modal closes and reopens', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'current-user' } } as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(mockPartidosSnapshot([
        { player1Uid: 'current-user', player2Uid: 'opponent-1', winnerUid: 'current-user', gameId: 'game-1', createdAt: new Date('2026-06-03') },
      ]) as never)
      .mockResolvedValueOnce(mockJuegosSnapshot as never);

    const { rerender } = render(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Your wins')).toBeTruthy();
    });

    rerender(
      <RivalryModal
        isOpen={false}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    rerender(
      <RivalryModal
        isOpen={true}
        opponentUid="opponent-1"
        opponentName="Alice"
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText('Loading rivalry stats...')).toBeTruthy();
  });
});
