import { Avatar, Icon } from '../components/ui';

interface TournamentChampionBannerProps {
  championUid: string | null;
  championName: string | null;
  isTie: boolean;
  tiedUids: string[];
  tiedNames: string[];
}

export function TournamentChampionBanner({
  championUid,
  championName,
  isTie,
  tiedUids,
  tiedNames,
}: TournamentChampionBannerProps): React.JSX.Element | null {
  if (!championUid && !isTie) return null;

  if (isTie) {
    return (
      <div
        className="ht-card ht-card-pad"
        style={{
          background: 'color-mix(in srgb, var(--win) 15%, var(--bg-2))',
          border: '1px solid color-mix(in srgb, var(--win) 40%, transparent)',
          textAlign: 'center',
          padding: '20px 16px',
          marginBottom: 20,
        }}
      >
        <Icon
          name="swords"
          style={{ width: 28, height: 28, color: 'var(--win)', marginBottom: 10 }}
        />
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--win)', marginBottom: 6 }}>
          It's a tie!
        </div>
        <div className="ht-row" style={{ justifyContent: 'center', gap: 12, marginTop: 10 }}>
          {tiedUids.map((uid, i) => (
            <div key={uid} style={{ textAlign: 'center' }}>
              <Avatar uid={uid} displayName={tiedNames[i] ?? '?'} size={36} glow />
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                {tiedNames[i] ?? '?'}
              </div>
            </div>
          ))}
        </div>
        <div className="ht-faint" style={{ fontSize: 12, marginTop: 10 }}>
          Shared rank — settle it in a rematch.
        </div>
      </div>
    );
  }

  return (
    <div
      className="ht-card ht-card-pad"
      style={{
        background: 'color-mix(in srgb, var(--win) 15%, var(--bg-2))',
        border: '1px solid color-mix(in srgb, var(--win) 40%, transparent)',
        textAlign: 'center',
        padding: '20px 16px',
        marginBottom: 20,
      }}
    >
      <Icon
        name="trophy"
        style={{ width: 32, height: 32, color: 'var(--win)', marginBottom: 10 }}
      />
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--win)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
        Champion
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Avatar uid={championUid ?? ''} displayName={championName ?? '?'} size={48} glow />
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--win)' }}>
          {championName}
        </div>
      </div>
      <div className="ht-faint" style={{ fontSize: 12, marginTop: 10 }}>
        Tournament complete. The board has spoken.
      </div>
    </div>
  );
}
