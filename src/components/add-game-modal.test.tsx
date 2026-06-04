import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddGameModal } from './add-game-modal';

describe('AddGameModal', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <AddGameModal
        isOpen={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render modal with title and form fields when open', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New Game')).toBeTruthy();
    expect(screen.getByLabelText('Game Name')).toBeTruthy();
    expect(screen.getByLabelText('Category')).toBeTruthy();
  });

  it('should focus the game name input when modal opens', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByLabelText('Game Name')).toHaveFocus();
  });

  it('should disable submit button when fields are empty', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    const submitButton = screen.getByRole('button', { name: 'Add Game' });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when both fields have values', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.change(screen.getByLabelText('Game Name'), { target: { value: 'Test Game' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Test Category' } });
    const submitButton = screen.getByRole('button', { name: 'Add Game' });
    expect(submitButton).not.toBeDisabled();
  });

  it('should keep submit button disabled when game name is whitespace-only', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.change(screen.getByLabelText('Game Name'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Test Category' } });
    const submitButton = screen.getByRole('button', { name: 'Add Game' });
    expect(submitButton).toBeDisabled();
  });

  it('should keep submit button disabled when category is whitespace-only', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.change(screen.getByLabelText('Game Name'), { target: { value: 'Test Game' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '   ' } });
    const submitButton = screen.getByRole('button', { name: 'Add Game' });
    expect(submitButton).toBeDisabled();
  });

  it('should call onSubmit with trimmed values when form is valid', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.change(screen.getByLabelText('Game Name'), { target: { value: '  Test Game  ' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '  Sports  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Game' }));
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Test Game', 'Sports');
    });
  });

  it('should show error message when onSubmit throws', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Network error'));
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.change(screen.getByLabelText('Game Name'), { target: { value: 'Test Game' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Sports' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Game' }));
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  it('should call onCancel when Cancel button is clicked', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onCancel when Escape key is pressed', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should not allow cancel while submitting', () => {
    mockOnSubmit.mockImplementation(() => new Promise(() => {}));
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.change(screen.getByLabelText('Game Name'), { target: { value: 'Test Game' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Sports' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Game' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('should reset form state when modal closes and reopens', () => {
    const { rerender } = render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    fireEvent.change(screen.getByLabelText('Game Name'), { target: { value: 'Test Game' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Sports' } });

    rerender(
      <AddGameModal
        isOpen={false}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    rerender(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('Game Name')).toHaveValue('');
    expect(screen.getByLabelText('Category')).toHaveValue('');
  });

  it('should have aria-modal attribute set to true', () => {
    render(
      <AddGameModal
        isOpen={true}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});
