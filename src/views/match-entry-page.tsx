import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { RequireAuth } from '../components/require-auth';
import { withAuthProvider, WithActiveGroup } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { AddGameModal } from '../components/add-game-modal';
import { Avatar, Icon } from '../components/ui';
import { getFirestoreInstance } from '../lib/firebase-client';
import { resolvePlayerName } from '../lib/resolve-player-name';
import { withGroupId, fetchGroupMembers } from '../lib/groups';
import { useActiveGroup } from '../hooks/use-active-group';
import type { Game, Player, MatchFormState, MatchFormErrors } from '../types/match';
import { INITIAL_FORM_STATE } from '../types/match';

type SubmitStatus = 'idle' | 'success' | 'error';

/* ---- Player chip picker ---- */
interface PlayerPickerProps {
  label: string;
  players: Player[];
  value: string;
  onChange: (uid: string) => void;
  disabledUid: string;
}

function PlayerPicker({ label, players, value, onChange, disabledUid }: PlayerPickerProps): React.JSX.Element {
  return (
    <div className="ht-field">
      <div className="ht-label">{label}</div>
      <div className="ht-chiprow">
        {players.map((p) => {
          const active = value === p.id;
          const dim = disabledUid === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={dim}
              onClick={() => onChange(p.id)}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 13px 7px 7px', borderRadius: 99,
                background: active ? 'color-mix(in srgb, var(--accent) 18%, var(--bg-2))' : 'var(--bg-2)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                color: active ? '#fff' : 'var(--text-dim)',
                opacity: dim ? 0.32 : 1,
                cursor: dim ? 'not-allowed' : 'pointer',
                transition: 'all .14s', whiteSpace: 'nowrap',
              }}
            >
              <Avatar uid={p.id} displayName={p.displayName} size={28} ring={active} />
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{p.displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Score stepper ---- */
interface ScoreStepperProps {
  player: Player | null;
  value: string;
  onChange: (val: string) => void;
}

function ScoreStepper({ player, value, onChange }: ScoreStepperProps): React.JSX.Element {
  const num = parseInt(value, 10) || 0;
  return (
    <div style={{ flex: 1 }}>
      <div className="ht-row ht-gap8" style={{ marginBottom: 9, alignItems: 'center' }}>
        {player
          ? <Avatar uid={player.id} displayName={player.displayName} size={22} />
          : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-3)' }} />
        }
        <span className="ht-label" style={{ margin: 0 }}>{player?.displayName ?? '—'}</span>
      </div>
      <div className="ht-stepper">
        <button type="button" onClick={() => onChange(String(Math.max(0, num - 1)))} aria-label="minus">–</button>
        <span className="ht-num">{num}</span>
        <button type="button" onClick={() => onChange(String(num + 1))} aria-label="plus">+</button>
      </div>
    </div>
  );
}

/* ---- Main page ---- */
function MatchEntryContent(): React.JSX.Element {
  const db = getFirestoreInstance();
  const { activeGroupId, loading: groupLoading } = useActiveGroup();

  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [form, setForm] = useState<MatchFormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<MatchFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const gamesSnap = await getDocs(collection(db, 'juegos'));
        if (cancelled) return;

        setGames(gamesSnap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id, name: (doc.data().name as string) ?? 'Unknown', category: (doc.data().category as string) ?? '', ref: doc.ref,
        })));

        // Players: scoped to active group members if available, otherwise fallback to all usuarios
        if (activeGroupId) {
          const members = await fetchGroupMembers(activeGroupId);
          if (cancelled) return;

          // Fetch user details for members
          const playerPromises = members.map(async (m) => {
            const userSnap = await getDocs(query(collection(db, 'usuarios'), where('__name__', '==', m.uid)));
            if (!userSnap.empty) {
              const data = userSnap.docs[0].data();
              return {
                id: m.uid,
                displayName: resolvePlayerName({ nickname: data.nickname, name: data.name }),
                ref: userSnap.docs[0].ref,
              };
            }
            return { id: m.uid, displayName: 'Unknown', ref: {} as Player['ref'] };
          });

          const resolvedPlayers = await Promise.all(playerPromises);
          if (!cancelled) setPlayers(resolvedPlayers);
        } else {
          const playersSnap = await getDocs(collection(db, 'usuarios'));
          if (cancelled) return;
          setPlayers(playersSnap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data();
            return {
              id: doc.id,
              displayName: resolvePlayerName({ nickname: data.nickname, name: data.name }),
              ref: doc.ref,
            };
          }));
        }
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [db, activeGroupId]);

  const p1obj = players.find((p) => p.id === form.player1Uid) ?? null;
  const p2obj = players.find((p) => p.id === form.player2Uid) ?? null;
  const s1 = parseInt(form.score1, 10) || 0;
  const s2 = parseInt(form.score2, 10) || 0;
  const drawn = s1 === s2;
  const winner = !drawn ? (s1 > s2 ? p1obj : p2obj) : null;

  const setField = useCallback((field: keyof MatchFormState, val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => { const n = { ...prev }; delete n[field as keyof MatchFormErrors]; delete n.general; return n; });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: MatchFormErrors = {};
    if (!form.gameId)      newErrors.gameId     = 'Pick a game';
    if (!form.player1Uid)  newErrors.player1Uid = 'Pick player 1';
    if (!form.player2Uid)  newErrors.player2Uid = 'Pick player 2';
    if (form.player1Uid && form.player2Uid && form.player1Uid === form.player2Uid)
      newErrors.player1Uid = 'Pick two different players';
    if (!drawn && s1 === s2) newErrors.general = 'No draws — scores must differ';
    if (drawn) newErrors.general = 'No draws — scores must differ';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const auth = getAuth();
    if (!auth.currentUser) { setSubmitError('You must be signed in'); setSubmitStatus('error'); return; }

    setIsSubmitting(true); setSubmitStatus('idle'); setSubmitError(null);
    try {
      const matchData = withGroupId({
        gameId: form.gameId,
        player1Uid: form.player1Uid, player2Uid: form.player2Uid,
        score1: s1, score2: s2,
        winnerUid: s1 > s2 ? form.player1Uid : form.player2Uid,
        recordedByUid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      }, activeGroupId ?? '');

      await addDoc(collection(db, 'partidos'), matchData);
      setSubmitStatus('success');
      setForm(INITIAL_FORM_STATE);
      setErrors({});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit match');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, s1, s2, drawn, db]);

  const handleAddGame = useCallback(async (name: string, category: string) => {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('Must be signed in');
    const tempId = `temp-${Date.now()}`;
    setGames((prev) => [...prev, { id: tempId, name, category, ref: {} as Game['ref'] }]);
    setIsAddGameOpen(false);
    try {
      const docRef = await addDoc(collection(db, 'juegos'), { name, category, createdBy: auth.currentUser!.uid, createdAt: serverTimestamp() });
      setGames((prev) => prev.map((g) => g.id === tempId ? { ...g, id: docRef.id, ref: docRef } : g));
      setField('gameId', docRef.id);
    } catch {
      setGames((prev) => prev.filter((g) => g.id !== tempId));
      setIsAddGameOpen(true);
    }
  }, [db, setField]);

  if (loading) {
    return <div className="ht-eyebrow" style={{ paddingTop: 40 }}>Loading…</div>;
  }
  if (fetchError) {
    return <div style={{ color: 'var(--loss)', paddingTop: 40 }}>Error: {fetchError}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div className="ht-eyebrow">No draws. Somebody has to lose.</div>
        <h1 className="ht-page-title">Log a Match</h1>
      </div>

      {submitStatus === 'success' && (
        <div className="ht-badge ht-badge-win" style={{ marginBottom: 18, padding: '10px 16px', borderRadius: 'var(--r)', fontSize: 14 }}>
          <Icon name="check" style={{ width: 16, height: 16 }} />
          Match logged. The record stands.
        </div>
      )}

      <form className="ht-card ht-card-pad" onSubmit={handleSubmit} noValidate>

        {/* game */}
        <div className="ht-field">
          <div className="ht-row ht-between" style={{ marginBottom: 9 }}>
            <span className="ht-label" style={{ margin: 0 }}>Game</span>
            <button
              type="button" onClick={() => setIsAddGameOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
            >
              <Icon name="plus" style={{ width: 14, height: 14 }} />Add game
            </button>
          </div>
          <div className="ht-chiprow">
            {games.map((g) => (
              <button
                key={g.id} type="button"
                className={`ht-chip${form.gameId === g.id ? ' active' : ''}`}
                onClick={() => setField('gameId', g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
          {errors.gameId && <p className="ht-field-err">{errors.gameId}</p>}
        </div>

        <PlayerPicker label="Player 1" players={players} value={form.player1Uid} onChange={(v) => setField('player1Uid', v)} disabledUid={form.player2Uid} />
        {errors.player1Uid && <p className="ht-field-err" style={{ marginTop: -12, marginBottom: 12 }}>{errors.player1Uid}</p>}

        <PlayerPicker label="Player 2" players={players} value={form.player2Uid} onChange={(v) => setField('player2Uid', v)} disabledUid={form.player1Uid} />
        {errors.player2Uid && <p className="ht-field-err" style={{ marginTop: -12, marginBottom: 12 }}>{errors.player2Uid}</p>}

        {/* scores */}
        <div className="ht-field">
          <div className="ht-label">Score</div>
          <div className="ht-row ht-gap16">
            <ScoreStepper player={p1obj} value={form.score1} onChange={(v) => setField('score1', v)} />
            <ScoreStepper player={p2obj} value={form.score2} onChange={(v) => setField('score2', v)} />
          </div>
        </div>

        {/* winner preview */}
        <div style={{
          borderRadius: 'var(--r)', padding: '13px 16px', marginBottom: 16,
          background: winner ? 'color-mix(in srgb, var(--win) 12%, var(--bg-2))' : 'var(--bg-2)',
          border: `1px solid ${winner ? 'color-mix(in srgb, var(--win) 40%, transparent)' : 'var(--line)'}`,
          display: 'flex', alignItems: 'center', gap: 11, minHeight: 52,
        }}>
          {winner ? (
            <>
              <Icon name="standings" style={{ width: 18, height: 18, color: 'var(--win)' }} />
              <span className="ht-label" style={{ margin: 0 }}>Winner</span>
              <Avatar uid={winner.id} displayName={winner.displayName} size={26} />
              <strong style={{ color: 'var(--win)', fontSize: 15 }}>{winner.displayName}</strong>
            </>
          ) : (
            <span className="ht-muted" style={{ fontSize: 13.5 }}>
              {drawn && s1 > 0 ? 'No draws — scores must differ' : 'Set the score — winner decided automatically'}
            </span>
          )}
        </div>

        {errors.general && <p className="ht-field-err" style={{ marginBottom: 12 }}>{errors.general}</p>}
        {submitStatus === 'error' && submitError && <p className="ht-field-err" style={{ marginBottom: 12 }}>{submitError}</p>}

        <button type="submit" className="ht-btn ht-btn-primary ht-btn-block" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Submit Match'}
        </button>
      </form>

      <AddGameModal isOpen={isAddGameOpen} onSubmit={handleAddGame} onCancel={() => setIsAddGameOpen(false)} />
    </div>
  );
}

function MatchEntryPageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <WithActiveGroup>
        <AppShell activePage="log">
          <MatchEntryContent />
        </AppShell>
      </WithActiveGroup>
    </RequireAuth>
  );
}

export const MatchEntryPage = withAuthProvider(MatchEntryPageContent);
