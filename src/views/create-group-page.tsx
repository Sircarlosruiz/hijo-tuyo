import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { ActiveGroupProvider } from '../hooks/use-active-group';
import { CreateGroupForm } from '../components/create-group-form';
import { useAuth } from '../hooks/use-auth';

function CreateGroupPageContent(): React.JSX.Element {
  return (
    <div className="ht-create-group-page">
      <div className="ht-eyebrow">Start your circle</div>
      <CreateGroupForm
        onSuccess={() => {
          window.location.href = '/groups';
        }}
      />
    </div>
  );
}

function CreateGroupPageWithAuth(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <RequireAuth>
      {user && (
        <ActiveGroupProvider uid={user.uid}>
          <AppShell activePage="dashboard">
            <CreateGroupPageContent />
          </AppShell>
        </ActiveGroupProvider>
      )}
    </RequireAuth>
  );
}

export const CreateGroupPage = withAuthProvider(CreateGroupPageWithAuth);
