import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { AppShell } from '../components/app-shell';
import { ActiveGroupProvider } from '../hooks/use-active-group';
import { JoinGroupForm } from '../components/join-group-form';
import { useAuth } from '../hooks/use-auth';

interface JoinGroupPageProps {
  code?: string;
}

function JoinGroupPageContent({ code }: JoinGroupPageProps): React.JSX.Element {
  return (
    <div className="ht-join-group-page">
      <div className="ht-eyebrow">Join a circle</div>
      <JoinGroupForm
        initialCode={code}
        onSuccess={() => {
          window.location.href = '/groups';
        }}
      />
    </div>
  );
}

function JoinGroupPageWithAuth({ code }: JoinGroupPageProps): React.JSX.Element {
  const { user } = useAuth();

  return (
    <RequireAuth>
      {user && (
        <ActiveGroupProvider uid={user.uid}>
          <AppShell activePage="dashboard">
            <JoinGroupPageContent code={code} />
          </AppShell>
        </ActiveGroupProvider>
      )}
    </RequireAuth>
  );
}

export const JoinGroupPage = withAuthProvider(JoinGroupPageWithAuth);
