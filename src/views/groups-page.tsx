import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { ActiveGroupProvider } from '../hooks/use-active-group';
import { RequireGroup } from '../components/require-group';
import { OnboardingGate } from '../components/onboarding-gate';
import { GroupSwitcher } from '../components/group-switcher';
import { InviteManager } from '../components/invite-manager';
import { MemberList } from '../components/member-list';
import { GroupSettingsPanel } from '../components/group-settings-panel';
import { useAuth } from '../hooks/use-auth';
import { useActiveGroup } from '../hooks/use-active-group';

function GroupsPageContent(): React.JSX.Element {
  const { user } = useAuth();
  const { activeGroupId, groups, loading } = useActiveGroup();

  if (loading) {
    return <div className="ht-eyebrow">Loading groups...</div>;
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return (
    <div>
      <div className="ht-row ht-between" style={{ marginBottom: 22, alignItems: 'flex-end' }}>
        <div>
          <div className="ht-eyebrow">Your circles</div>
          <h1 className="ht-page-title">Groups</h1>
        </div>
      </div>

      {activeGroup && user && (
        <>
          <div className="ht-card" style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, marginBottom: 8 }}>{activeGroup.name}</h2>
            <p className="ht-faint">
              You are {activeGroup.myRole === 'owner' ? 'the owner' : 'a member'} of this
              group.
            </p>

            <InviteManager groupId={activeGroup.id} uid={user.uid} />
          </div>

          <div className="ht-card" style={{ marginBottom: 16 }}>
            <MemberList groupId={activeGroup.id} />
          </div>

          <div className="ht-card">
            <GroupSettingsPanel
              groupId={activeGroup.id}
              currentName={activeGroup.name}
            />
          </div>
        </>
      )}

      <div className="ht-card" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>All Your Groups</h3>
        <ul className="ht-groups-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {groups.map((group) => (
            <li
              key={group.id}
              className="ht-group-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span className="ht-group-name" style={{ flex: 1, fontSize: 14 }}>
                {group.name}
              </span>
              <span
                className="ht-group-role"
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 99,
                  background: group.myRole === 'owner' ? 'var(--accent)' : 'var(--bg-3)',
                  color: group.myRole === 'owner' ? '#fff' : 'var(--text-dim)',
                  fontWeight: 600,
                }}
              >
                {group.myRole}
              </span>
              {group.id === activeGroupId && (
                <span
                  className="ht-group-active-badge"
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: 'var(--win)',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  Active
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GroupsPageWithGroupGate(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <RequireAuth>
      {user && (
        <ActiveGroupProvider uid={user.uid}>
          <RequireGroup
            onNoGroups={() => <OnboardingGate />}
          >
            <AppShell activePage="groups">
              <GroupsPageContent />
            </AppShell>
          </RequireGroup>
        </ActiveGroupProvider>
      )}
    </RequireAuth>
  );
}

export const GroupsPage = withAuthProvider(GroupsPageWithGroupGate);
