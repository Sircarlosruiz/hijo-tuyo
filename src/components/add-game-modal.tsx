import { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';

interface AddGameModalProps {
  isOpen: boolean;
  onSubmit: (name: string, category: string) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  name?: string;
  category?: string;
}

export function AddGameModal({ isOpen, onSubmit, onCancel }: AddGameModalProps): React.JSX.Element | null {
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      nameInputRef.current?.focus();

      const handleEscape = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && !isSubmitting) {
          handleCancel();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, isSubmitting]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setCategory('');
      setErrors({});
      setSubmitError(null);
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const validateField = useCallback((fieldName: 'name' | 'category', value: string): string | undefined => {
    if (value.trim().length === 0) {
      return fieldName === 'name' ? 'Game name is required' : 'Category is required';
    }
    return undefined;
  }, []);

  const handleFieldChange = useCallback(
    (field: 'name' | 'category', value: string): void => {
      if (field === 'name') {
        setName(value);
      } else {
        setCategory(value);
      }

      setErrors((prev: FormErrors) => {
        const next = { ...prev };
        const error = validateField(field, value);
        if (error) {
          next[field] = error;
        } else {
          delete next[field];
        }
        return next;
      });
    },
    [validateField]
  );

  const isFormValid = name.trim().length > 0 && category.trim().length > 0;

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

      const nameError = validateField('name', name);
      const categoryError = validateField('category', category);

      if (nameError || categoryError) {
        setErrors({ name: nameError, category: categoryError });
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        await onSubmit(name.trim(), category.trim());
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add game';
        setSubmitError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, category, onSubmit, validateField]
  );

  const handleCancel = useCallback((): void => {
    if (!isSubmitting) {
      onCancel();
    }
  }, [isSubmitting, onCancel]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (e.target === e.currentTarget) {
        handleCancel();
      }
    },
    [handleCancel]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-game-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="add-game-modal-title" className="mb-4 text-xl font-semibold text-gray-900">
          Add New Game
        </h2>

        {submitError && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="add-game-name" className="mb-1 block text-sm font-medium text-gray-700">
              Game Name
            </label>
            <input
              ref={nameInputRef}
              id="add-game-name"
              type="text"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange('name', e.target.value)}
              disabled={isSubmitting}
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'add-game-name-error' : undefined}
            />
            {errors.name && (
              <p id="add-game-name-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="add-game-category" className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <input
              id="add-game-category"
              type="text"
              value={category}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange('category', e.target.value)}
              disabled={isSubmitting}
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'add-game-category-error' : undefined}
            />
            {errors.category && (
              <p id="add-game-category-error" className="mt-1 text-xs text-red-600" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Adding...' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
