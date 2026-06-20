import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, getDocs, updateDoc, collection, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { RequireAuth } from '../components/require-auth';
import { RequireGroup } from '../components/require-group';
import { OnboardingGate } from '../components/onboarding-gate';
import { withAuthProvider, WithActiveGroup } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { SignOutButton } from '../components/sign-out-button';
import { Avatar, RecordPill, StreakBadge, Icon } from '../components/ui';
import { getFirestoreInstance } from '../lib/firebase-client';
import { useAuth } from '../hooks/use-auth';
import { useActiveGroup } from '../hooks/use-active-group';

interface ProfileData { nickname: string | null; displayName: string | null; }

interface SeasonStats {
  wins: number; losses: number; winRate: number;
  streak: { type: 'W' | 'L' | null; count: number };
  bestGame: string | null;
  nemesis: string | null;
  victim: string | null;
}

interface FirestorePartido {
  gameId: string; player1Uid: string; player2Uid: string;
  winnerUid: string; createdAt: { toDate: () => Date };
}

function StatTile({ label, children, accent }: { label: string; children: React.ReactNode; accent?: string }): React.JSX.Element {
  return (
    <div className="ht-stat-tile">
      <div className="ht-label" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent ?? 'var(--text)' }}>{children}</div>
    </div>
  );
}

async function loadSeasonStats(uid: string, groupId: string): Promise<SeasonStats> {
  const db = getFirestoreInstance();
  const [partidosSnap, juegosSnap, usuariosSnap] = await Promise.all([
    getDocs(query(collection(db, 'partidos'), where('groupId', '==', groupId))),
    getDocs(collection(db, 'juegos')),
    getDocs(collection(db, 'usuarios')),
  ]);

  const gameNames: Record<string, string> = {};
  juegosSnap.forEach((d) => { gameNames[d.id] = (d.data() as { name: string }).name; });

  const userNames: Record<string, string> = {};
  usuariosSnap.forEach((d) => {
    const data = d.data() as { nickname?: string; name?: string };
    userNames[d.id] = data.nickname ?? data.name ?? 'Unknown';
  });

  const myMatches: FirestorePartido[] = [];
  partidosSnap.forEach((d) => {
    const m = d.data() as FirestorePartido;
    if (m.player1Uid === uid || m.player2Uid === uid) myMatches.push(m);
  });

  myMatches.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());

  let wins = 0; let losses = 0;
  const perGame: Record<string, { w: number; t: number }> = {};
  const h2h: Record<string, { w: number; l: number }> = {};

  for (const m of myMatches) {
    const youWon = m.winnerUid === uid;
    if (youWon) wins++; else losses++;
    perGame[m.gameId] = perGame[m.gameId] ?? { w: 0, t: 0 };
    perGame[m.gameId].t++;
    if (youWon) perGame[m.gameId].w++;
    const opp = m.player1Uid === uid ? m.player2Uid : m.player1Uid;
    h2h[opp] = h2h[opp] ?? { w: 0, l: 0 };
    if (youWon) h2h[opp].w++; else h2h[opp].l++;
  }

  const total = wins + losses;

  // streak
  let streakType: 'W' | 'L' | null = null;
  let streakCount = 0;
  if (myMatches.length > 0) {
    streakType = myMatches[0].winnerUid === uid ? 'W' : 'L';
    for (const m of myMatches) {
      const r = m.winnerUid === uid ? 'W' : 'L';
      if (r === streakType) streakCount++; else break;
    }
  }

  // best game (min 2 matches, best win rate)
  let bestGame: string | null = null;
  let bestRate = -1;
  for (const [gid, { w, t }] of Object.entries(perGame)) {
    if (t >= 2 && w / t > bestRate) { bestRate = w / t; bestGame = gameNames[gid] ?? null; }
  }

  // nemesis (most negative diff)
  let nemesis: string | null = null; let nemesisDiff = 0;
  // victim (most positive diff)
  let victim: string | null = null; let victimDiff = 0;
  for (const [opp, { w, l }] of Object.entries(h2h)) {
    if (w + l < 2) continue;
    const diff = w - l;
    if (diff > victimDiff) { victimDiff = diff; victim = userNames[opp] ?? null; }
    if (diff < nemesisDiff) { nemesisDiff = diff; nemesis = userNames[opp] ?? null; }
  }

  return {
    wins, losses, winRate: total > 0 ? wins / total : 0,
    streak: { type: streakType, count: streakCount },
    bestGame, nemesis, victim,
  };
}

function ProfileContent(): React.JSX.Element {
  const db = getFirestoreInstance();
  const auth = getAuth();
  const { user } = useAuth();
  const { activeGroupId, loading: groupLoading } = useActiveGroup();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [stats, setStats] = useState<SeasonStats | null>(null);

  useEffect(() => {
    if (!user || groupLoading) return;
    let cancelled = false;
    void (async () => {
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (cancelled) return;
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({ nickname: (data.nickname as string) ?? null, displayName: (data.name as string) ?? user.displayName ?? null });
        } else {
          setProfile({ nickname: null, displayName: user.displayName ?? null });
        }
        if (activeGroupId) {
          const s = await loadSeasonStats(user.uid, activeGroupId);
          if (!cancelled) setStats(s);
        } else if (!cancelled) {
          setStats(null);
        }
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [db, user, activeGroupId, groupLoading]);

  useEffect(() => {
    if (profile) setNickname(profile.nickname ?? profile.displayName ?? '');
  }, [profile]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null); setValidationError(null);
    const trimmed = nickname.trim();
    if (!trimmed) { setValidationError('Nickname cannot be empty'); return; }
    if (trimmed.length > 40) { setValidationError('Max 40 characters'); return; }
    if (!auth.currentUser) { setSaveError('Must be signed in'); setSaveStatus('error'); return; }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { nickname: trimmed });
      setSaveStatus('success');
      setProfile((prev) => prev ? { ...prev, nickname: trimmed } : prev);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [nickname, db, auth]);

  const displayedAs = profile?.nickname ?? profile?.displayName ?? user?.displayName ?? 'Player';

  if (loading || groupLoading) {
    return <div className="ht-eyebrow" style={{ paddingTop: 40 }}>Loading…</div>;
  }
  if (fetchError) {
    return <div style={{ color: 'var(--loss)', paddingTop: 40 }}>Error: {fetchError}</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 className="ht-page-title">Profile</h1>
      </div>

      {/* identity card */}
      <div className="ht-card ht-card-pad" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar
          uid={user?.uid ?? ''}
          displayName={displayedAs}
          photoURL={user?.photoURL}
          size={64} ring glow isYou
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
            {displayedAs}
          </div>
          <div className="ht-faint" style={{ fontSize: 13, marginTop: 5 }}>{user?.email}</div>
        </div>
        {stats && stats.streak.count >= 2 && <StreakBadge streak={stats.streak} />}
      </div>

      {/* season stats */}
      {stats && (
        <div className="ht-card ht-card-pad" style={{ marginBottom: 18 }}>
          <h2 className="ht-section-title" style={{ marginBottom: 16 }}>Your Season</h2>
          <div className="ht-stat-grid">
            <StatTile label="Record">
              <RecordPill wins={stats.wins} losses={stats.losses} size="lg" />
            </StatTile>
            <StatTile label="Win rate" accent="var(--accent)">
              {Math.round(stats.winRate * 100)}%
            </StatTile>
            {stats.bestGame && (
              <StatTile label="Best game">{stats.bestGame}</StatTile>
            )}
            {stats.streak.count > 0 && (
              <StatTile
                label="Streak"
                accent={stats.streak.type === 'W' ? 'var(--win)' : 'var(--loss)'}
              >
                {stats.streak.type}{stats.streak.count}
              </StatTile>
            )}
            {stats.victim && (
              <StatTile label="Favourite victim" accent="var(--win)">{stats.victim}</StatTile>
            )}
            {stats.nemesis && (
              <StatTile label="Nemesis" accent="var(--loss)">{stats.nemesis}</StatTile>
            )}
          </div>
        </div>
      )}

      {/* nickname editor */}
      <div className="ht-card ht-card-pad" style={{ marginBottom: 18 }}>
        {saveStatus === 'success' && (
          <div className="ht-badge ht-badge-win" style={{ marginBottom: 14 }}>
            <Icon name="check" style={{ width: 12, height: 12 }} />Saved.
          </div>
        )}
        <form onSubmit={handleSave} noValidate>
          <div className="ht-field" style={{ marginBottom: 14 }}>
            <label htmlFor="profile-nickname" className="ht-label">Nickname</label>
            <input
              id="profile-nickname"
              className={`ht-input${validationError ? ' err' : ''}`}
              value={nickname}
              maxLength={40}
              onChange={(e) => { setNickname(e.target.value); setValidationError(null); setSaveStatus('idle'); }}
              disabled={isSaving}
            />
            {validationError
              ? <p className="ht-field-err">{validationError}</p>
              : <p className="ht-field-hint">Shown on the leaderboard and match history.</p>
            }
            {saveError && <p className="ht-field-err">{saveError}</p>}
          </div>
          <button type="submit" className="ht-btn ht-btn-primary ht-btn-block" disabled={isSaving || !nickname.trim()}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>

      <SignOutButton />
    </div>
  );
}

function ProfilePageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <WithActiveGroup>
        <RequireGroup onNoGroups={() => <OnboardingGate />}>
          <AppShell activePage="profile">
            <ProfileContent />
          </AppShell>
        </RequireGroup>
      </WithActiveGroup>
    </RequireAuth>
  );
}

export const ProfilePage = withAuthProvider(ProfilePageContent);
