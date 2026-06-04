import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { NavProfileLink } from '../components/nav-profile-link';
import { getFirestoreInstance } from '../lib/firebase-client';
import type { Game, Player, MatchFormState, MatchFormErrors } from '../types/match';
import { INITIAL_FORM_STATE } from '../types/match';
import { AddGameModal } from '../components/add-game-modal';

type SubmitStatus = 'idle' | 'success' | 'error';

function MatchEntryPageContent(): React.JSX.Element {
  const db = getFirestoreInstance();

  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState<MatchFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<MatchFormErrors>({});

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isAddGameOpen, setIsAddGameOpen] = useState<boolean>(false);
  const [addGameError, setAddGameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData(): Promise<void> {
      try {
        const [gamesSnap, playersSnap] = await Promise.all([
          getDocs(collection(db, 'juegos')),
          getDocs(collection(db, 'usuarios')),
        ]);

        if (cancelled) return;

        const mappedGames: Game[] = gamesSnap.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            name: (doc.data().name as string) ?? 'Unknown Game',
            category: (doc.data().category as string) ?? '',
            ref: doc.ref,
          })
        );

        const mappedPlayers: Player[] = playersSnap.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            displayName: (doc.data().name as string) ?? 'Unknown Player',
            ref: doc.ref,
          })
        );

        setGames(mappedGames);
        setPlayers(mappedPlayers);
        setFetchError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setFetchError(message);
        console.error('Failed to fetch match entry data', { error: err });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [db]);

  const validatePlayers = useCallback((player1Uid: string, player2Uid: string): string | undefined => {
    if (player1Uid && player2Uid && player1Uid === player2Uid) {
      return 'Players must be different';
    }
    return undefined;
  }, []);

  const validateScores = useCallback((score1: string, score2: string): { score1?: string; score2?: string; general?: string } => {
    const result: { score1?: string; score2?: string; general?: string } = {};

    if (score1 && score2) {
      const s1 = Number(score1);
      const s2 = Number(score2);
      if (s1 === s2) {
        result.general = 'No draws allowed';
      }
    }

    return result;
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof MatchFormState, value: string): void => {
      setForm((prev: MatchFormState) => ({ ...prev, [field]: value }));

      setErrors((prev: MatchFormErrors) => {
        const next = { ...prev };

        if (field === 'player1Uid' || field === 'player2Uid') {
          const p1 = field === 'player1Uid' ? value : form.player1Uid;
          const p2 = field === 'player2Uid' ? value : form.player2Uid;
          next.player1Uid = validatePlayers(p1, p2);
          next.player2Uid = undefined;
        }

        if (field === 'score1' || field === 'score2') {
          const s1 = field === 'score1' ? value : form.score1;
          const s2 = field === 'score2' ? value : form.score2;
          const scoreErrors = validateScores(s1, s2);
          next.score1 = scoreErrors.score1;
          next.score2 = scoreErrors.score2;
          next.general = scoreErrors.general;
        }

        if (next[field as keyof MatchFormErrors] === undefined) {
          delete next[field as keyof MatchFormErrors];
        }

        return next;
      });
    },
    [form.player1Uid, form.player2Uid, form.score1, form.score2, validatePlayers, validateScores]
  );

  const validateAll = useCallback((): MatchFormErrors => {
    const newErrors: MatchFormErrors = {};

    if (!form.gameId) {
      newErrors.gameId = 'Select a game';
    }
    if (!form.player1Uid) {
      newErrors.player1Uid = 'Select player 1';
    }
    if (!form.player2Uid) {
      newErrors.player2Uid = 'Select player 2';
    }
    if (!form.score1) {
      newErrors.score1 = 'Enter score for player 1';
    }
    if (!form.score2) {
      newErrors.score2 = 'Enter score for player 2';
    }

    const playerError = validatePlayers(form.player1Uid, form.player2Uid);
    if (playerError) {
      newErrors.player1Uid = playerError;
    }

    const scoreErrors = validateScores(form.score1, form.score2);
    if (scoreErrors.general) {
      newErrors.general = scoreErrors.general;
    }

    return newErrors;
  }, [form, validatePlayers, validateScores]);

  const handleAddGameSubmit = useCallback(
    async (gameName: string, gameCategory: string): Promise<void> => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be signed in to add a game');
      }

      const tempId = `temp-${Date.now()}`;
      const newGame: Game = {
        id: tempId,
        name: gameName,
        category: gameCategory,
        ref: {} as Game['ref'],
      };

      setGames((prev: Game[]) => [...prev, newGame]);
      setIsAddGameOpen(false);

      try {
        const docRef = await addDoc(collection(db, 'juegos'), {
          name: gameName,
          category: gameCategory,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        setGames((prev: Game[]) =>
          prev.map((game: Game) =>
            game.id === tempId
              ? { ...game, id: docRef.id, ref: docRef }
              : game
          )
        );

        setForm((prev: MatchFormState) => ({ ...prev, gameId: docRef.id }));
      } catch (err: unknown) {
        setGames((prev: Game[]) => prev.filter((game: Game) => game.id !== tempId));
        const message = err instanceof Error ? err.message : 'Failed to add game';
        setAddGameError(message);
        setIsAddGameOpen(true);
        console.error('Failed to add game', { error: err, name: gameName, category: gameCategory });
      }
    },
    [db]
  );

  const handleAddGameCancel = useCallback((): void => {
    setIsAddGameOpen(false);
    setAddGameError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      setSubmitError(null);

      const newErrors = validateAll();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setSubmitError('You must be signed in to submit a match');
        setSubmitStatus('error');
        return;
      }

      const winnerUid = Number(form.score1) > Number(form.score2) ? form.player1Uid : form.player2Uid;

      setIsSubmitting(true);
      setSubmitStatus('idle');

      try {
        await addDoc(collection(db, 'partidos'), {
          gameId: form.gameId,
          player1Uid: form.player1Uid,
          player2Uid: form.player2Uid,
          score1: Number(form.score1),
          score2: Number(form.score2),
          winnerUid,
          recordedByUid: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        setSubmitStatus('success');
        setForm(INITIAL_FORM_STATE);
        setErrors({});
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit match';
        setSubmitError(message);
        setSubmitStatus('error');
        console.error('Failed to submit match', { error: err, form });
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateAll, form, db]
  );

  if (loading) {
    return <div>Loading match entry form...</div>;
  }

  if (fetchError) {
    return <div>Error: {fetchError}</div>;
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <NavProfileLink />
      </div>

      <h1>Match Entry</h1>

      {submitStatus === 'success' && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '4px' }}>
          Match submitted successfully!
        </div>
      )}

      {submitStatus === 'error' && submitError && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="game-select">Game</label>
          <select
            id="game-select"
            value={form.gameId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFieldChange('gameId', e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="">Select a game</option>
            {games.map((game: Game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
          {errors.gameId && <p style={{ color: 'red', margin: '0.25rem 0 0' }}>{errors.gameId}</p>}
          <button
            type="button"
            onClick={() => setIsAddGameOpen(true)}
            disabled={isSubmitting}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-60"
          >
            ＋ Add Game
          </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="player1-select">Player 1</label>
          <select
            id="player1-select"
            value={form.player1Uid}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFieldChange('player1Uid', e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="">Select player 1</option>
            {players.map((player: Player) => (
              <option key={player.id} value={player.id}>
                {player.displayName}
              </option>
            ))}
          </select>
          {errors.player1Uid && <p style={{ color: 'red', margin: '0.25rem 0 0' }}>{errors.player1Uid}</p>}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="player2-select">Player 2</label>
          <select
            id="player2-select"
            value={form.player2Uid}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleFieldChange('player2Uid', e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', padding: '0.5rem' }}
          >
            <option value="">Select player 2</option>
            {players.map((player: Player) => (
              <option key={player.id} value={player.id}>
                {player.displayName}
              </option>
            ))}
          </select>
          {errors.player2Uid && <p style={{ color: 'red', margin: '0.25rem 0 0' }}>{errors.player2Uid}</p>}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="score1-input">Score 1</label>
            <input
              id="score1-input"
              type="number"
              min="0"
              step="1"
              value={form.score1}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange('score1', e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.5rem' }}
            />
            {errors.score1 && <p style={{ color: 'red', margin: '0.25rem 0 0' }}>{errors.score1}</p>}
          </div>

          <div style={{ flex: 1 }}>
            <label htmlFor="score2-input">Score 2</label>
            <input
              id="score2-input"
              type="number"
              min="0"
              step="1"
              value={form.score2}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleFieldChange('score2', e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.5rem' }}
            />
            {errors.score2 && <p style={{ color: 'red', margin: '0.25rem 0 0' }}>{errors.score2}</p>}
          </div>
        </div>

        {errors.general && <p style={{ color: 'red', margin: '0.5rem 0' }}>{errors.general}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '0.75rem 1.5rem',
            width: '100%',
            opacity: isSubmitting ? 0.6 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Match'}
        </button>
      </form>

      <AddGameModal
        isOpen={isAddGameOpen}
        onSubmit={handleAddGameSubmit}
        onCancel={handleAddGameCancel}
      />
    </div>
  );
}

export const MatchEntryPage = withAuthProvider(MatchEntryPageContent);
