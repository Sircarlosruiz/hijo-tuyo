import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupSwitcher } from './group-switcher';
import { useActiveGroup } from '../hooks/use-active-group';

vi.mock('../hooks/use-active-group', () => ({
  useActiveGroup: vi.fn(),
}));

const originalLocation = window.location;

function mockGroups() {
  vi.mocked(useActiveGroup).mockReturnValue({
    loading: false,
    hasGroups: true,
    groups: [
      { id: 'group-1', name: 'Padel Crew', myRole: 'owner' },
      { id: 'group-2', name: 'Office League', myRole: 'member' },
    ],
    activeGroupId: 'group-1',
    setActiveGroup: vi.fn(),
    isOwner: vi.fn(),
  } as any);
}

describe('GroupSwitcher — create-new-group action (story 002 AC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('shows a "Create new group" action when a member with groups opens the switcher', () => {
    mockGroups();
    render(<GroupSwitcher />);

    // Action is not visible until the switcher is opened
    expect(screen.queryByText('+ Create new group')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /select group|padel crew/i }));

    expect(screen.getByText('+ Create new group')).toBeInTheDocument();
  });

  it('lists existing groups alongside the create action (no leave-first required)', () => {
    mockGroups();
    render(<GroupSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /select group|padel crew/i }));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(screen.getByText('Office League')).toBeInTheDocument();
    // "Padel Crew" appears both as the active-group label and as a list option
    expect(screen.getAllByText('Padel Crew').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+ Create new group')).toBeInTheDocument();
  });

  it('navigates to the create-group flow (/groups/new) when the action is clicked', () => {
    mockGroups();
    render(<GroupSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: /select group|padel crew/i }));
    fireEvent.click(screen.getByText('+ Create new group'));

    expect(window.location.href).toBe('/groups/new');
  });

  it('does not render the switcher (nor the create action) for a member with zero groups', () => {
    vi.mocked(useActiveGroup).mockReturnValue({
      loading: false,
      hasGroups: false,
      groups: [],
      activeGroupId: null,
      setActiveGroup: vi.fn(),
      isOwner: vi.fn(),
    } as any);

    render(<GroupSwitcher />);

    expect(screen.getByText('No groups')).toBeInTheDocument();
    expect(screen.queryByText('+ Create new group')).not.toBeInTheDocument();
  });
});
