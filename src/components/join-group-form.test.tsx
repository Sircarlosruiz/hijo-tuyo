import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinGroupForm } from './join-group-form';

// Mock dependencies
vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));

vi.mock('../lib/groups', () => ({
  redeemInvite: vi.fn(),
}));

describe('JoinGroupForm', () => {
  it('should render with heading and input', () => {
    render(<JoinGroupForm />);

    expect(screen.getByText('Join a Group')).toBeTruthy();
    expect(screen.getByLabelText('Invite code')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Join Group' })).toBeTruthy();
  });

  it('should disable submit when code is empty', () => {
    render(<JoinGroupForm />);

    const submitButton = screen.getByRole('button', { name: 'Join Group' });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit when code has content', async () => {
    const user = userEvent.setup();
    render(<JoinGroupForm />);

    const input = screen.getByLabelText('Invite code');
    await user.type(input, 'ABCD1234');

    const submitButton = screen.getByRole('button', { name: 'Join Group' });
    expect(submitButton).not.toBeDisabled();
  });

  it('should pre-fill code from initialCode prop', () => {
    render(<JoinGroupForm initialCode="PRECODE" />);

    const input = screen.getByLabelText('Invite code') as HTMLInputElement;
    expect(input.value).toBe('PRECODE');
  });

  it('should uppercase input values', async () => {
    const user = userEvent.setup();
    render(<JoinGroupForm />);

    const input = screen.getByLabelText('Invite code') as HTMLInputElement;
    await user.type(input, 'abcd');

    expect(input.value).toBe('ABCD');
  });
});
