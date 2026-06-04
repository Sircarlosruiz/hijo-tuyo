import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NavProfileLink } from './nav-profile-link';

describe('NavProfileLink', () => {
  it('should render a link to /profile', () => {
    render(<NavProfileLink />);
    const link = screen.getByRole('link', { name: 'Profile' });
    expect(link).toHaveAttribute('href', '/profile');
  });

  it('should have appropriate styling classes', () => {
    render(<NavProfileLink />);
    const link = screen.getByRole('link', { name: 'Profile' });
    expect(link).toHaveClass('text-blue-600');
    expect(link).toHaveClass('hover:text-blue-700');
  });
});
