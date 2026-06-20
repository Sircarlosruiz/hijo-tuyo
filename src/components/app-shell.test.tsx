import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { AppShell } from './app-shell';

vi.mock('../hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));
vi.mock('../hooks/use-usuario', () => ({
  useUsuario: vi.fn(),
}));

// Render the switcher as a lightweight marker so we can assert placement
// without pulling in the active-group data layer.
vi.mock('./group-switcher', () => ({
  GroupSwitcher: ({ className }: { className?: string }) => (
    <div data-testid="group-switcher" data-classname={className ?? ''} />
  ),
}));

import { useAuth } from '../hooks/use-auth';
import { useUsuario } from '../hooks/use-usuario';

function mockUser() {
  vi.mocked(useAuth).mockReturnValue({
    user: { uid: 'u1', displayName: 'Carlos', photoURL: null },
  } as any);
  vi.mocked(useUsuario).mockReturnValue({
    usuario: { nickname: 'Carlos', name: 'Carlos', email: 'c@x.com', photoURL: null },
    loading: false,
  } as any);
}

describe('AppShell — group switcher placement (story 012-desktop-group-switcher)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it('renders the group switcher inside the desktop sidebar', () => {
    const { container } = render(<AppShell activePage="dashboard">content</AppShell>);

    const sidebar = container.querySelector('.ht-sidebar');
    expect(sidebar).not.toBeNull();
    const sidebarSwitchers = sidebar!.querySelectorAll('[data-testid="group-switcher"]');
    expect(sidebarSwitchers).toHaveLength(1);
  });

  it('keeps the group switcher in the mobile top bar', () => {
    const { container } = render(<AppShell activePage="dashboard">content</AppShell>);

    const topbar = container.querySelector('.ht-topbar');
    expect(topbar).not.toBeNull();
    const topbarSwitchers = topbar!.querySelectorAll('[data-testid="group-switcher"]');
    expect(topbarSwitchers).toHaveLength(1);
  });

  it('renders exactly one switcher per layout container (one sidebar + one top bar)', () => {
    const { getAllByTestId } = render(<AppShell activePage="dashboard">content</AppShell>);

    // Two instances exist in the DOM; CSS (media queries) shows only one per breakpoint.
    expect(getAllByTestId('group-switcher')).toHaveLength(2);
  });
});
