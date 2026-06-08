import { useState, useCallback } from 'react';
import { RequireAuth } from '../components/require-auth';
import { withAuthProvider, WithActiveGroup } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { TournamentFixtureList } from '../components/tournament-fixture-list';
import { TournamentRecordForm } from '../components/tournament-record-form';
import { TournamentStandings } from '../components/tournament-standings';
import { TournamentChampionBanner } from '../components/tournament-champion-banner';
import { Icon } from '../components/ui';
import { useTournament, useTournamentCreateData, useTournamentPartidos } from '../hooks/use-tournaments';
import { useActiveGroup } from '../hooks/use-active-group';
import { computeStandings } from '../lib/standings-computer';
import { detectCompletion } from '../lib/completion-detector';

function getTournamentId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search).get('id') ?? undefined;
}

function TournamentDetailContent(): React.JSX.Element {
  const id = getTournamentId();
  const { activeGroupId, loading: groupLoading } = useActiveGroup();
  const { tournament, loading, error } = useTournament(id ?? '');
  const { players, loading: dataLoading } = useTournamentCreateData();
  const { partidos, loading: partidosLoading, refresh: refreshPartidos } = useTournamentPartidos(
    id ?? '',
    activeGroupId ?? undefined,
  );

  const [recordingFixtureId, setRecordingFixtureId] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const handleRecordSuccess = useCallback(() => {
    setRecordingFixtureId(null);
    refreshPartidos();
    window.location.reload();
  }, [refreshPartidos]);

  const handleRecordCancel = useCallback(() => {
    setRecordingFixtureId(null);
    setRecordError(null);
  }, []);

  const handleRecordClick = useCallback((fixtureId: string) => {
    setRecordingFixtureId(fixtureId);
    setRecordError(null);
  }, []);

  if (groupLoading || loading || dataLoading || partidosLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 40 }}>
        <div className="ht-eyebrow">Loading tournament…</div>
        <div className="ht-card" style={{ height: 200, opacity: 0.4, animation: 'none' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ht-card ht-card-pad" style={{ color: 'var(--loss)', marginTop: 40 }}>
        <strong>Failed to load:</strong> {error}
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ paddingTop: 40 }}>
        <div className="ht-eyebrow">Not found</div>
        <h1 className="ht-page-title">Tournament Not Found</h1>
        <p className="ht-muted" style={{ marginBottom: 20 }}>
          This tournament doesn't exist or has been removed.
        </p>
        <a href="/tournaments" className="ht-btn ht-btn-primary">
          Back to Tournaments
        </a>
      </div>
    );
  }

  const isComplete = tournament.status === 'complete';
  const playedCount = tournament.fixtures.filter((f) => f.status === 'played').length;
  const totalCount = tournament.fixtures.length;

  const playerNameMap = new Map(
    players.map((p) => [p.id, p.displayName]),
  );

  const standings = computeStandings(
    tournament.participantUids,
    playerNameMap,
    tournament.fixtures,
    partidos,
  );

  const completion = detectCompletion(tournament.fixtures, standings);

  const tiedNames = completion.tiedUids.map(
    (uid) => playerNameMap.get(uid) ?? 'Unknown',
  );

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <a
          href="/tournaments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-dim)',
            fontSize: 13,
            textDecoration: 'none',
            marginBottom: 12,
          }}
        >
          <Icon name="arrow-left" style={{ width: 14, height: 14 }} />
          Back to Tournaments
        </a>
        <div className="ht-row ht-between" style={{ alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div className="ht-eyebrow">
              {isComplete
                ? 'Final standings locked'
                : completion.isComplete
                  ? 'Tournament complete!'
                  : `${playedCount}/${totalCount} played`}
            </div>
            <h1 className="ht-page-title">{tournament.name}</h1>
          </div>
          <span
            className={`ht-badge ${isComplete ? 'ht-badge-win' : 'ht-badge-info'}`}
            style={{ fontSize: 12 }}
          >
            {isComplete ? 'Complete' : 'Active'}
          </span>
        </div>
      </div>

      {completion.isComplete && (
        <TournamentChampionBanner
          championUid={completion.championUid}
          championName={completion.championName}
          isTie={completion.isTie}
          tiedUids={completion.tiedUids}
          tiedNames={tiedNames}
        />
      )}

      {!isComplete && standings.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <TournamentStandings standings={standings} currentUid="" />
        </div>
      )}

      <TournamentFixtureList
        fixtures={tournament.fixtures}
        players={players}
        recordingFixtureId={recordingFixtureId}
        onRecordClick={handleRecordClick}
        disabled={isComplete}
      />

      {recordingFixtureId && (
        <div style={{ marginTop: 16 }}>
          {(() => {
            const fixture = tournament.fixtures.find(
              (f) => f.fixtureId === recordingFixtureId,
            );
            if (!fixture) return null;

            return (
              <TournamentRecordForm
                fixture={fixture}
                tournamentId={tournament.id}
                gameId={tournament.gameId}
                groupId={activeGroupId ?? ''}
                games={[]}
                players={players}
                onSuccess={handleRecordSuccess}
                onCancel={handleRecordCancel}
              />
            );
          })()}
        </div>
      )}

      {recordError && (
        <p className="ht-field-err" style={{ marginTop: 12 }}>{recordError}</p>
      )}
    </div>
  );
}

function TournamentDetailPageContent(): React.JSX.Element {
  return (
    <RequireAuth>
      <WithActiveGroup>
        <AppShell activePage="tournaments">
          <TournamentDetailContent />
        </AppShell>
      </WithActiveGroup>
    </RequireAuth>
  );
}

export const TournamentDetailPage = withAuthProvider(TournamentDetailPageContent);
