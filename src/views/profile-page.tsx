import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { getFirestoreInstance } from '../lib/firebase-client';

interface ProfileData {
  nickname: string | null;
  displayName: string | null;
}

function ProfilePageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent(): React.JSX.Element {
  const db = getFirestoreInstance();
  const auth = getAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [nickname, setNickname] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const MAX_NICKNAME_LENGTH = 40;

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile(): Promise<void> {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid));

        if (cancelled) return;

        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            nickname: (data.nickname as string) ?? null,
            displayName: (data.name as string) ?? currentUser.displayName ?? null,
          });
        } else {
          setProfile({
            nickname: null,
            displayName: currentUser.displayName ?? null,
          });
        }

        setFetchError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        setFetchError(message);
        console.error('Failed to fetch profile', { error: err, uid: currentUser.uid });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [db, auth]);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname ?? profile.displayName ?? '');
    }
  }, [profile]);

  const handleNicknameChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    setNickname(e.target.value);
    setValidationError(null);
    setSaveStatus('idle');
    setSaveError(null);
  }, []);

  const handleSave = useCallback(
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      setSaveError(null);
      setValidationError(null);

      const trimmed = nickname.trim();

      if (trimmed.length === 0) {
        setValidationError('Nickname cannot be empty');
        return;
      }

      if (trimmed.length > MAX_NICKNAME_LENGTH) {
        setValidationError(`Nickname must be ${MAX_NICKNAME_LENGTH} characters or less`);
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setSaveError('You must be signed in to save');
        setSaveStatus('error');
        return;
      }

      const previousValue = nickname;
      setIsSaving(true);
      setSaveStatus('idle');

      try {
        await updateDoc(doc(db, 'usuarios', currentUser.uid), {
          nickname: trimmed,
        });

        setSaveStatus('success');
        setProfile((prev: ProfileData | null) =>
          prev ? { ...prev, nickname: trimmed } : prev
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save nickname';
        setSaveError(message);
        setSaveStatus('error');
        setNickname(previousValue);
        console.error('Failed to save nickname', { error: err, uid: currentUser.uid });
      } finally {
        setIsSaving(false);
      }
    },
    [nickname, db, auth]
  );

  const currentDisplayName = profile?.nickname ?? profile?.displayName ?? 'Unknown';

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-red-600">
        <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
        <p>Failed to load profile: {fetchError}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold text-gray-900">Profile</h1>

      {saveStatus === 'success' && (
        <div className="mb-4 rounded bg-green-50 p-3 text-sm text-green-700">
          Nickname saved successfully!
        </div>
      )}

      {saveStatus === 'error' && saveError && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="mb-6 rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-500">Currently displayed as</p>
        <p className="text-lg font-medium text-gray-900">{currentDisplayName}</p>
      </div>

      <form onSubmit={handleSave} noValidate>
        <div className="mb-4">
          <label htmlFor="profile-nickname" className="mb-1 block text-sm font-medium text-gray-700">
            Nickname
          </label>
          <input
            id="profile-nickname"
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            maxLength={MAX_NICKNAME_LENGTH}
            disabled={isSaving}
            className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
              validationError ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-invalid={!!validationError}
            aria-describedby={validationError ? 'nickname-error' : 'nickname-hint'}
            placeholder="Enter your nickname"
          />
          <div className="mt-1 flex items-center justify-between">
            {validationError ? (
              <p id="nickname-error" className="text-xs text-red-600" role="alert">
                {validationError}
              </p>
            ) : (
              <p id="nickname-hint" className="text-xs text-gray-500">
                This name will appear on the leaderboard and match history
              </p>
            )}
            <span className="text-xs text-gray-400">
              {nickname.length}/{MAX_NICKNAME_LENGTH}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving || nickname.trim().length === 0}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save Nickname'}
        </button>
      </form>
    </div>
  );
}

export const ProfilePage = withAuthProvider(ProfilePageContent);
