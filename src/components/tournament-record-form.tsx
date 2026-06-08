import { useState, useCallback } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFirestoreInstance } from '../lib/firebase-client';
import { Avatar, Icon } from '../components/ui';
import type { TournamentFixture, GameOption, PlayerOption } from '../types/tournament';

interface TournamentRecordFormProps {
  fixture: TournamentFixture;
  tournamentId: string;
  gameId: string;
  groupId: string;
  games: GameOption[];
  players: PlayerOption[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TournamentRecordForm({
  fixture,
  tournamentId,
  gameId,
  groupId,
  games,
  players,
  onSuccess,
  onCancel,
}: TournamentRecordFormProps): React.JSX.Element {
  const db = getFirestoreInstance();

  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const p1 = players.find((p) => p.id === fixture.player1Uid);
  const p2 = players.find((p) => p.id === fixture.player2Uid);
  const game = games.find((g) => g.id === gameId);

  const drawn = score1 === score2;
  const winner = !drawn
    ? score1 > score2
      ? p1
      : p2
    : null;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (drawn) {
        setSubmitError('No draws — scores must differ');
        return;
      }

      const auth = getAuth();
      if (!auth.currentUser) {
        setSubmitError('You must be signed in');
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const winnerUid = score1 > score2 ? fixture.player1Uid : fixture.player2Uid;

        const matchDoc = await addDoc(collection(db, 'partidos'), {
          gameId,
          player1Uid: fixture.player1Uid,
          player2Uid: fixture.player2Uid,
          score1,
          score2,
          winnerUid,
          recordedByUid: auth.currentUser.uid,
          tournamentId,
          fixtureId: fixture.fixtureId,
          groupId,
          createdAt: serverTimestamp(),
        });

        const tournamentRef = doc(db, 'torneos', tournamentId);
        const tournamentSnap = await getDoc(tournamentRef);

        if (!tournamentSnap.exists()) {
          setSubmitError('Tournament not found');
          return;
        }

        const tournamentData = tournamentSnap.data();
        const existingFixtures = (tournamentData.fixtures ?? []) as TournamentFixture[];

        const updatedFixtures = existingFixtures.map((f) =>
          f.fixtureId === fixture.fixtureId
            ? { ...f, status: 'played' as const, matchId: matchDoc.id }
            : f,
        );

        await updateDoc(tournamentRef, { fixtures: updatedFixtures });

        onSuccess();
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to record result');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      drawn,
      score1,
      score2,
      fixture,
      gameId,
      tournamentId,
      db,
      onSuccess,
    ],
  );

  return (
    <div
      style={{
        borderRadius: 'var(--r)',
        padding: '16px',
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        marginTop: 8,
      }}
    >
      <div className="ht-row ht-between" style={{ marginBottom: 12, alignItems: 'center' }}>
        <span className="ht-label" style={{ margin: 0 }}>
          Record Result
        </span>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <Icon name="x" style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-dim)' }}>
        {game?.name ?? 'Unknown Game'}
      </div>

      <div className="ht-row ht-gap16" style={{ marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <Avatar uid={fixture.player1Uid} displayName={p1?.displayName ?? '?'} size={32} />
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
            {p1?.displayName ?? '?'}
          </div>
        </div>
        <span className="ht-muted" style={{ fontSize: 14 }}>vs</span>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <Avatar uid={fixture.player2Uid} displayName={p2?.displayName ?? '?'} size={32} />
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>
            {p2?.displayName ?? '?'}
          </div>
        </div>
      </div>

      <div className="ht-field">
        <div className="ht-label">Score</div>
        <div className="ht-row ht-gap16">
          <div style={{ flex: 1 }}>
            <div className="ht-label" style={{ marginBottom: 6 }}>
              {p1?.displayName ?? '?'}
            </div>
            <div className="ht-stepper">
              <button
                type="button"
                onClick={() => setScore1(Math.max(0, score1 - 1))}
                aria-label="minus"
              >
                –
              </button>
              <span className="ht-num">{score1}</span>
              <button
                type="button"
                onClick={() => setScore1(score1 + 1)}
                aria-label="plus"
              >
                +
              </button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="ht-label" style={{ marginBottom: 6 }}>
              {p2?.displayName ?? '?'}
            </div>
            <div className="ht-stepper">
              <button
                type="button"
                onClick={() => setScore2(Math.max(0, score2 - 1))}
                aria-label="minus"
              >
                –
              </button>
              <span className="ht-num">{score2}</span>
              <button
                type="button"
                onClick={() => setScore2(score2 + 1)}
                aria-label="plus"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {winner && (
        <div
          style={{
            borderRadius: 'var(--r)',
            padding: '10px 14px',
            marginBottom: 14,
            background: 'color-mix(in srgb, var(--win) 12%, var(--bg-2))',
            border: '1px solid color-mix(in srgb, var(--win) 40%, transparent)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Icon name="check" style={{ width: 16, height: 16, color: 'var(--win)' }} />
          <span style={{ fontSize: 13 }}>
            Winner:{' '}
            <strong style={{ color: 'var(--win)' }}>{winner.displayName}</strong>
          </span>
        </div>
      )}

      {drawn && score1 > 0 && (
        <p className="ht-field-err" style={{ marginBottom: 12 }}>
          No draws — scores must differ
        </p>
      )}

      {submitError && <p className="ht-field-err" style={{ marginBottom: 12 }}>{submitError}</p>}

      <button
        type="submit"
        className="ht-btn ht-btn-primary ht-btn-block"
        disabled={isSubmitting || drawn}
        onClick={handleSubmit}
      >
        {isSubmitting ? 'Saving…' : 'Record Result'}
      </button>
    </div>
  );
}
