import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireAuth } from './require-auth';
import { getStoredRedirectUrl } from '../lib/auth-redirect';
import { useAuth } from '../hooks/use-auth';

vi.mock('../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./auth-loading', () => ({
  AuthLoading: () => <div data-testid="auth-loading">Loading...</div>,
}));

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { href: '', pathname: '/test', search: '' },
      writable: true,
    });
  });

  it('should render loading while auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true });

    render(
      <RequireAuth>
        <div data-testid="protected-content">Protected</div>
      </RequireAuth>,
    );

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: '123' } as any,
      loading: false,
    });

    render(
      <RequireAuth>
        <div data-testid="protected-content">Protected</div>
      </RequireAuth>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument();
  });

  it('should redirect to home when user is null and not loading', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });

    render(
      <RequireAuth>
        <div data-testid="protected-content">Protected</div>
      </RequireAuth>,
    );

    expect(window.location.href).toBe('/');
  });

  it('should store current URL in sessionStorage before redirecting', () => {
    Object.defineProperty(window, 'location', {
      value: { href: '', pathname: '/match-entry', search: '?id=1' },
      writable: true,
    });
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });

    render(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>,
    );

    expect(sessionStorage.getItem('auth_redirect_url')).toBe('/match-entry?id=1');
  });
});

describe('getStoredRedirectUrl', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('should return stored URL and clear it from sessionStorage', () => {
    sessionStorage.setItem('auth_redirect_url', '/dashboard');

    const result = getStoredRedirectUrl();

    expect(result).toBe('/dashboard');
    expect(sessionStorage.getItem('auth_redirect_url')).toBeNull();
  });

  it('should return null when no redirect is stored', () => {
    expect(getStoredRedirectUrl()).toBeNull();
  });

  it('should return null and not clear when URL does not start with /', () => {
    sessionStorage.setItem('auth_redirect_url', 'https://evil.com');

    const result = getStoredRedirectUrl();

    expect(result).toBeNull();
    expect(sessionStorage.getItem('auth_redirect_url')).toBe('https://evil.com');
  });
});
