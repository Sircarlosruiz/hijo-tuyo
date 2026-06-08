import { useState } from 'react';
import { CreateGroupForm } from './create-group-form';
import { JoinGroupForm } from './join-group-form';

type OnboardingMode = 'choose' | 'create' | 'join';

interface OnboardingGateProps {
  inviteCode?: string;
}

export function OnboardingGate({ inviteCode }: OnboardingGateProps): React.JSX.Element {
  const [mode, setMode] = useState<OnboardingMode>(inviteCode ? 'join' : 'choose');

  if (mode === 'create') {
    return (
      <div className="ht-onboarding">
        <CreateGroupForm
          onSuccess={() => {
            window.location.href = '/groups';
          }}
        />
        <p className="ht-onboarding-back">
          <button
            type="button"
            className="ht-btn ht-btn-link"
            onClick={() => setMode('choose')}
          >
            ← Back
          </button>
        </p>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="ht-onboarding">
        <JoinGroupForm
          initialCode={inviteCode}
          onSuccess={() => {
            window.location.href = '/groups';
          }}
        />
        {!inviteCode && (
          <p className="ht-onboarding-back">
            <button
              type="button"
              className="ht-btn ht-btn-link"
              onClick={() => setMode('choose')}
            >
              ← Back
            </button>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="ht-onboarding ht-onboarding-choose">
      <h2>Welcome!</h2>
      <p className="ht-onboarding-intro">
        You are not in any group yet. Create your own or join a friend&apos;s group to
        start recording matches and tracking stats.
      </p>

      <div className="ht-onboarding-actions">
        <button
          type="button"
          className="ht-btn ht-btn-primary ht-btn-lg"
          onClick={() => setMode('create')}
        >
          Create a Group
        </button>

        <button
          type="button"
          className="ht-btn ht-btn-secondary ht-btn-lg"
          onClick={() => setMode('join')}
        >
          Join with an Invite
        </button>
      </div>
    </div>
  );
}
