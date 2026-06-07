import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { ActiveGroupProvider } from '../hooks/use-active-group';
import { RequireGroup } from '../components/require-group';
import { OnboardingGate } from '../components/onboarding-gate';
import { GroupSwitcher } from '../components/group-switcher';
import { InviteManager } from '../components/invite-manager';
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

      {activeGroup && (
        <div className="ht-card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{activeGroup.name}</h2>
          <p className="ht-faint">
            You are {activeGroup.myRole === 'owner' ? 'the owner' : 'a member'} of this
            group.
          </p>

          {user && (
            <InviteManager groupId={activeGroup.id} uid={user.uid} />
          )}
        </div>
      )}

      <div className="ht-card">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>All Your Groups</h3>
        <ul className="ht-groups-list">
          {groups.map((group) => (
            <li key={group.id} className="ht-group-item">
              <span className="ht-group-name">{group.name}</span>
              <span className="ht-group-role">{group.myRole}</span>
              {group.id === activeGroupId && (
                <span className="ht-group-active-badge">Active</span>
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
            <AppShell activePage="dashboard">
              <GroupsPageContent />
            </AppShell>
          </RequireGroup>
        </ActiveGroupProvider>
      )}
    </RequireAuth>
  );
}

export const GroupsPage = withAuthProvider(GroupsPageWithGroupGate);
