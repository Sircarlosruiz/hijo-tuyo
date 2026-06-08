import { useState, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFirestoreInstance } from '../lib/firebase-client';
import { generateRoundRobinSchedule, expectedFixtureCount } from '../lib/schedule-generator';
import { Avatar, Icon } from '../components/ui';
import type {
  TournamentFormData,
  TournamentFormErrors,
  GameOption,
  PlayerOption,
} from '../types/tournament';

const INITIAL_FORM: TournamentFormData = {
  name: '',
  gameId: '',
  participantUids: [],
};

interface TournamentCreateFormProps {
  games: GameOption[];
  players: PlayerOption[];
  groupId: string | null;
}

export function TournamentCreateForm({
  games,
  players,
  groupId,
}: TournamentCreateFormProps): React.JSX.Element {
  const db = getFirestoreInstance();

  const [form, setForm] = useState<TournamentFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<TournamentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewFixtures, setPreviewFixtures] = useState(false);

  const setField = useCallback(
    (field: keyof TournamentFormData, val: string | string[]) => {
      setForm((prev) => ({ ...prev, [field]: val }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof TournamentFormErrors];
        delete next.general;
        return next;
      });
    },
    [],
  );

  const toggleParticipant = useCallback(
    (uid: string) => {
      setForm((prev) => {
        const exists = prev.participantUids.includes(uid);
        const next = exists
          ? prev.participantUids.filter((u) => u !== uid)
          : [...prev.participantUids, uid];
        return { ...prev, participantUids: next };
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next.participants;
        delete next.general;
        return next;
      });
    },
    [],
  );

  const fixtureCount = expectedFixtureCount(form.participantUids.length);

  const handlePreview = useCallback(() => {
    if (form.participantUids.length < 3) return;
    setPreviewFixtures((prev) => !prev);
  }, [form.participantUids.length]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const newErrors: TournamentFormErrors = {};
      if (!form.name.trim()) newErrors.name = 'Tournament name is required';
      if (!form.gameId) newErrors.gameId = 'Pick a game';
      if (form.participantUids.length < 3)
        newErrors.participants = 'Need at least 3 participants';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const auth = getAuth();
      if (!auth.currentUser) {
        setSubmitError('You must be signed in');
        return;
      }

      if (!groupId) {
        setSubmitError('No active group selected');
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const fixtures = generateRoundRobinSchedule(form.participantUids);

        await addDoc(collection(db, 'torneos'), {
          name: form.name.trim(),
          gameId: form.gameId,
          participantUids: form.participantUids,
          status: 'active',
          fixtures,
          createdByUid: auth.currentUser.uid,
          createdAt: serverTimestamp(),
          groupId,
        });

        window.location.href = '/tournaments';
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to create tournament');
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, db, groupId],
  );

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div className="ht-eyebrow">Set up the bracket. Lock the roster.</div>
        <h1 className="ht-page-title">Create Tournament</h1>
      </div>

      <form className="ht-card ht-card-pad" onSubmit={handleSubmit} noValidate>
        {/* name */}
        <div className="ht-field">
          <label className="ht-label" htmlFor="tournament-name">
            Name
          </label>
          <input
            id="tournament-name"
            className="ht-input"
            type="text"
            placeholder="e.g. FIFA Friday Night"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
          />
          {errors.name && <p className="ht-field-err">{errors.name}</p>}
        </div>

        {/* game */}
        <div className="ht-field">
          <div className="ht-label">Game</div>
          <div className="ht-chiprow">
            {games.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`ht-chip${form.gameId === g.id ? ' active' : ''}`}
                onClick={() => setField('gameId', g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
          {errors.gameId && <p className="ht-field-err">{errors.gameId}</p>}
        </div>

        {/* participants */}
        <div className="ht-field">
          <div className="ht-label">
            Participants ({form.participantUids.length} selected — need ≥3)
          </div>
          <div className="ht-chiprow">
            {players.map((p) => {
              const active = form.participantUids.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleParticipant(p.id)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '7px 13px 7px 7px',
                    borderRadius: 99,
                    background: active
                      ? 'color-mix(in srgb, var(--accent) 18%, var(--bg-2))'
                      : 'var(--bg-2)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                    color: active ? '#fff' : 'var(--text-dim)',
                    cursor: 'pointer',
                    transition: 'all .14s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Avatar uid={p.id} displayName={p.displayName} size={28} ring={active} />
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{p.displayName}</span>
                </button>
              );
            })}
          </div>
          {errors.participants && <p className="ht-field-err">{errors.participants}</p>}
        </div>

        {/* fixture preview */}
        {form.participantUids.length >= 3 && (
          <div
            style={{
              borderRadius: 'var(--r)',
              padding: '13px 16px',
              marginBottom: 16,
              background: 'var(--bg-2)',
              border: '1px solid var(--line)',
            }}
          >
            <div className="ht-row ht-between" style={{ alignItems: 'center' }}>
              <span className="ht-label" style={{ margin: 0 }}>
                {fixtureCount} fixtures will be generated
              </span>
              <button
                type="button"
                onClick={handlePreview}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  fontWeight: 700,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
              >
                <Icon name={previewFixtures ? 'eye-off' : 'eye'} style={{ width: 14, height: 14 }} />
                {previewFixtures ? 'Hide' : 'Preview'}
              </button>
            </div>
            {previewFixtures && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {generateRoundRobinSchedule(form.participantUids).map((f) => {
                  const p1 = players.find((p) => p.id === f.player1Uid);
                  const p2 = players.find((p) => p.id === f.player2Uid);
                  return (
                    <div
                      key={f.fixtureId}
                      style={{
                        fontSize: 13,
                        color: 'var(--text-dim)',
                        padding: '4px 0',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      {p1?.displayName ?? '?'} vs {p2?.displayName ?? '?'}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {errors.general && <p className="ht-field-err" style={{ marginBottom: 12 }}>{errors.general}</p>}
        {submitError && <p className="ht-field-err" style={{ marginBottom: 12 }}>{submitError}</p>}

        <button
          type="submit"
          className="ht-btn ht-btn-primary ht-btn-block"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating…' : 'Create Tournament'}
        </button>
      </form>
    </div>
  );
}
