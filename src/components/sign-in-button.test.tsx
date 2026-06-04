import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignInButton } from './sign-in-button';

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: class {},
}));

vi.mock('../lib/firebase-client', () => ({
  getAuthInstance: vi.fn().mockResolvedValue({}),
}));

describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with sign-in text', () => {
    render(<SignInButton />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('should not be disabled initially', () => {
    render(<SignInButton />);
    const button = screen.getByRole('button', { name: /sign in with google/i });
    expect(button).not.toBeDisabled();
  });

  it('should display error message when popup is blocked', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const mockSignInWithPopup = vi.mocked(signInWithPopup);
    const popupBlockedError = new Error('Popup blocked');
    (popupBlockedError as { code: string }).code = 'auth/popup-blocked';
    mockSignInWithPopup.mockRejectedValue(popupBlockedError);

    render(<SignInButton />);
    const button = screen.getByRole('button', { name: /sign in with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/popup was blocked/i)).toBeInTheDocument();
    });
  });

  it('should not display error when popup is closed by user', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const mockSignInWithPopup = vi.mocked(signInWithPopup);
    mockSignInWithPopup.mockRejectedValue({
      code: 'auth/popup-closed-by-user',
    });

    render(<SignInButton />);
    const button = screen.getByRole('button', { name: /sign in with google/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.queryByText(/sign-in failed/i)).not.toBeInTheDocument();
    });
  });
});
