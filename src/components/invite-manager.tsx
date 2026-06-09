import { useState } from 'react';
import { useInvites } from '../hooks/use-invites';
import type { InviteDefaults } from '../types/groups';
import { DEFAULT_INVITE_SETTINGS } from '../types/groups';
import { isInviteValid } from '../types/groups';

interface InviteManagerProps {
  groupId: string;
  uid: string;
}

export function InviteManager({ groupId, uid }: InviteManagerProps): React.JSX.Element {
  const { invites, loading, error, isOwner, createNew, revoke, regenerate } =
    useInvites(groupId, uid);
  const [creating, setCreating] = useState<boolean>(false);
  const [settings, setSettings] = useState<InviteDefaults>(DEFAULT_INVITE_SETTINGS);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCreate(): Promise<void> {
    setActionError(null);
    setCreating(true);
    try {
      await createNew(settings);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(inviteId: string): Promise<void> {
    setActionError(null);
    try {
      await revoke(inviteId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  }

  async function handleRegenerate(inviteId: string): Promise<void> {
    setActionError(null);
    try {
      await regenerate(inviteId, settings);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to regenerate invite');
    }
  }

  function getInviteLink(code: string): string {
    return `${window.location.origin}/groups/join?group=${groupId}&code=${code}`;
  }

  async function copyToClipboard(text: string, inviteId: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(inviteId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard not available
    }
  }

  if (loading) {
    return <div className="ht-invite-manager-loading">Loading invites...</div>;
  }

  if (!isOwner) {
    return (
      <div className="ht-invite-manager">
        <p className="ht-faint">Only the group owner can manage invites.</p>
      </div>
    );
  }

  return (
    <div className="ht-invite-manager">
      <h3>Invite Members</h3>

      {/* Create invite section */}
      <div className="ht-invite-create">
        <div className="ht-invite-options">
          <label className="ht-checkbox">
            <input
              type="checkbox"
              checked={settings.singleUse}
              onChange={(e) =>
                setSettings((s) => ({ ...s, singleUse: e.target.checked }))
              }
            />
            Single-use
          </label>

          <label className="ht-field-label" style={{ marginLeft: '1rem' }}>
            Expiry (days)
            <input
              type="number"
              className="ht-input ht-input-sm"
              min={0}
              max={365}
              value={settings.expiryDays}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  expiryDays: parseInt(e.target.value, 10) || 0,
                }))
              }
            />
            <span className="ht-faint">0 = no expiry</span>
          </label>
        </div>

        <button
          type="button"
          className="ht-btn ht-btn-primary"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Generate Invite Link'}
        </button>

        {actionError && <p className="ht-error">{actionError}</p>}
      </div>

      {/* Existing invites */}
      {invites.length > 0 && (
        <ul className="ht-invite-list">
          {invites.map((invite) => {
            const valid = isInviteValid(invite);
            const link = getInviteLink(invite.code);

            return (
              <li
                key={invite.inviteId}
                className={`ht-invite-item ${valid ? '' : 'ht-invite-invalid'}`}
              >
                <div className="ht-invite-code">
                  <code>{invite.code}</code>
                  <span className={`ht-invite-status ${valid ? 'valid' : 'invalid'}`}>
                    {valid ? 'Active' : invite.revoked ? 'Revoked' : 'Expired'}
                  </span>
                </div>

                <div className="ht-invite-meta">
                  <span>Uses: {invite.uses}</span>
                  {invite.maxUses !== null && <span> / {invite.maxUses}</span>}
                  {invite.expiresAt && (
                    <span>
                      {' '}
                      · Expires: {invite.expiresAt.toDate().toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="ht-invite-actions">
                  <button
                    type="button"
                    className="ht-btn ht-btn-sm"
                    onClick={() => copyToClipboard(link, invite.inviteId)}
                  >
                    {copiedId === invite.inviteId ? 'Copied!' : 'Copy Link'}
                  </button>
                  {valid && (
                    <>
                      <button
                        type="button"
                        className="ht-btn ht-btn-sm ht-btn-warn"
                        onClick={() => handleRegenerate(invite.inviteId)}
                      >
                        Regenerate
                      </button>
                      <button
                        type="button"
                        className="ht-btn ht-btn-sm ht-btn-danger"
                        onClick={() => handleRevoke(invite.inviteId)}
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="ht-error">{error}</p>}
    </div>
  );
}
