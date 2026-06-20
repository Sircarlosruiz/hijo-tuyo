import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireGroup } from './require-group';
import { useActiveGroup } from '../hooks/use-active-group';

vi.mock('../hooks/use-active-group', () => ({
  useActiveGroup: vi.fn(),
}));

vi.mock('./auth-loading', () => ({
  AuthLoading: () => <div data-testid="auth-loading">Loading...</div>,
}));

describe('RequireGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading while group membership is resolving', () => {
    vi.mocked(useActiveGroup).mockReturnValue({
      loading: true,
      hasGroups: false,
      groups: [],
      activeGroupId: null,
      isOwner: vi.fn(),
    } as any);

    render(
      <RequireGroup onNoGroups={() => <div data-testid="onboarding">Onboarding</div>}>
        <div data-testid="protected-content">Protected</div>
      </RequireGroup>,
    );

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument();
  });

  it('should render children when user has groups', () => {
    vi.mocked(useActiveGroup).mockReturnValue({
      loading: false,
      hasGroups: true,
      groups: [{ id: 'group-1' }],
      activeGroupId: 'group-1',
      isOwner: vi.fn(),
    } as any);

    render(
      <RequireGroup onNoGroups={() => <div data-testid="onboarding">Onboarding</div>}>
        <div data-testid="protected-content">Protected</div>
      </RequireGroup>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('onboarding')).not.toBeInTheDocument();
  });

  it('should render onNoGroups callback when user has no groups', () => {
    vi.mocked(useActiveGroup).mockReturnValue({
      loading: false,
      hasGroups: false,
      groups: [],
      activeGroupId: null,
      isOwner: vi.fn(),
    } as any);

    render(
      <RequireGroup onNoGroups={() => <div data-testid="onboarding">Onboarding</div>}>
        <div data-testid="protected-content">Protected</div>
      </RequireGroup>,
    );

    expect(screen.getByTestId('onboarding')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument();
  });

  it('should call onNoGroups as a function and render its result', () => {
    const onNoGroups = vi.fn(() => <div data-testid="custom-no-groups">No groups</div>);
    vi.mocked(useActiveGroup).mockReturnValue({
      loading: false,
      hasGroups: false,
      groups: [],
      activeGroupId: null,
      isOwner: vi.fn(),
    } as any);

    render(
      <RequireGroup onNoGroups={onNoGroups}>
        <div>Protected</div>
      </RequireGroup>,
    );

    expect(onNoGroups).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('custom-no-groups')).toBeInTheDocument();
  });
});
