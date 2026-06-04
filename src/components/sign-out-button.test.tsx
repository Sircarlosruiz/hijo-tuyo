import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignOutButton } from './sign-out-button';

const mockSignOut = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/auth', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock('../lib/firebase-client', () => ({
  getAuthInstance: vi.fn().mockResolvedValue({}),
}));

describe('SignOutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('should render with sign-out text', () => {
    render(<SignOutButton />);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('should not be disabled initially', () => {
    render(<SignOutButton />);
    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).not.toBeDisabled();
  });

  it('should call signOut and redirect on click', async () => {
    render(<SignOutButton />);
    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);

    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });

    expect(window.location.href).toBe('/');
  });

  it('should display error message when signOut fails', async () => {
    mockSignOut.mockRejectedValueOnce(new Error('Network error'));

    render(<SignOutButton />);
    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(button).not.toBeDisabled();
  });

  it('should call onSignOut callback after successful sign-out', async () => {
    const onSignOut = vi.fn();
    render(<SignOutButton onSignOut={onSignOut} />);
    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSignOut).toHaveBeenCalled();
    });
  });
});
