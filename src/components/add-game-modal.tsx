import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import { Icon } from './ui';

interface AddGameModalProps {
  isOpen: boolean;
  onSubmit: (name: string, category: string) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors { name?: string; category?: string; }

export function AddGameModal({ isOpen, onSubmit, onCancel }: AddGameModalProps): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      nameInputRef.current?.focus();
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSubmitting) onCancel(); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [isOpen, isSubmitting, onCancel]);

  useEffect(() => {
    if (!isOpen) {
      setName(''); setCategory(''); setErrors({}); setSubmitError(null);
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const validate = useCallback((field: 'name' | 'category', value: string) =>
    value.trim().length === 0 ? (field === 'name' ? 'Game name is required' : 'Category is required') : undefined,
  []);

  const handleChange = useCallback((field: 'name' | 'category', value: string) => {
    if (field === 'name') setName(value); else setCategory(value);
    setErrors((prev) => {
      const next = { ...prev };
      const err = validate(field, value);
      if (err) next[field] = err; else delete next[field];
      return next;
    });
  }, [validate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = validate('name', name);
    const catErr = validate('category', category);
    if (nameErr || catErr) { setErrors({ name: nameErr, category: catErr }); return; }
    setIsSubmitting(true); setSubmitError(null);
    try { await onSubmit(name.trim(), category.trim()); }
    catch (err) { setSubmitError(err instanceof Error ? err.message : 'Failed to add game'); }
    finally { setIsSubmitting(false); }
  }, [name, category, onSubmit, validate]);

  const handleBackdrop = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSubmitting) onCancel();
  }, [isSubmitting, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="ht-overlay" onMouseDown={handleBackdrop} role="dialog" aria-modal="true" aria-labelledby="add-game-title">
      <form className="ht-modal" onSubmit={handleSubmit} noValidate style={{ padding: 24 }}>
        <div className="ht-row ht-between" style={{ marginBottom: 18 }}>
          <h2 id="add-game-title" className="ht-section-title">New Game</h2>
          <button
            type="button" onClick={onCancel} aria-label="Close" disabled={isSubmitting}
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line-strong)', borderRadius: 9, width: 32, height: 32, display: 'grid', placeItems: 'center', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            <Icon name="x" style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {submitError && (
          <p className="ht-field-err" style={{ marginBottom: 14 }}>{submitError}</p>
        )}

        <div className="ht-field">
          <label htmlFor="add-game-name" className="ht-label">Game name</label>
          <input
            ref={nameInputRef}
            id="add-game-name"
            className={`ht-input${errors.name ? ' err' : ''}`}
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
            disabled={isSubmitting}
            placeholder="Valorant…"
            aria-invalid={errors.name ? 'true' : 'false'}
          />
          {errors.name && <p className="ht-field-err">{errors.name}</p>}
        </div>

        <div className="ht-field">
          <label htmlFor="add-game-cat" className="ht-label">Category</label>
          <input
            id="add-game-cat"
            className={`ht-input${errors.category ? ' err' : ''}`}
            value={category}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('category', e.target.value)}
            disabled={isSubmitting}
            aria-invalid={errors.category ? 'true' : 'false'}
          />
          <p className="ht-field-hint">e.g. Fighting, Racing, Sports</p>
          {errors.category && <p className="ht-field-err">{errors.category}</p>}
        </div>

        <div className="ht-row ht-gap12" style={{ marginTop: 6 }}>
          <button type="button" className="ht-btn ht-btn-ghost ht-btn-block" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="ht-btn ht-btn-primary ht-btn-block" disabled={isSubmitting || !name.trim() || !category.trim()}>
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
