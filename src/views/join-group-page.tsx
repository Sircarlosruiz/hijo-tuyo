import { RequireAuth } from '../components/require-auth';
import { withAuthProvider } from '../components/auth-provider-wrapper';
import { JoinGroupForm } from '../components/join-group-form';

interface JoinGroupPageProps {
  code?: string;
  groupId?: string;
}

function JoinGroupPageContent({ code, groupId }: JoinGroupPageProps): React.JSX.Element {
  return (
    <div className="ht-join-group-page">
      <div className="ht-eyebrow">Join a circle</div>
      <JoinGroupForm
        initialCode={code}
        groupId={groupId}
        onSuccess={() => {
          window.location.href = '/groups';
        }}
      />
    </div>
  );
}

function JoinGroupPageWithAuth({ code, groupId }: JoinGroupPageProps): React.JSX.Element {
  return (
    <RequireAuth>
      <JoinGroupPageContent code={code} groupId={groupId} />
    </RequireAuth>
  );
}

export const JoinGroupPage = withAuthProvider(JoinGroupPageWithAuth);
