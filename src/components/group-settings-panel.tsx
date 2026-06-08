import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useActiveGroup } from '../hooks/use-active-group';
import { renameGroup, deleteGroup } from '../lib/groups';

interface GroupSettingsPanelProps {
  groupId: string;
  currentName: string;
}

export function GroupSettingsPanel({
  groupId,
  currentName,
}: GroupSettingsPanelProps): React.JSX.Element {
  const { user } = useAuth();
  const { isOwner } = useActiveGroup();
  const [editing, setEditing] = useState<boolean>(false);
  const [name, setName] = useState<string>(currentName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');

  if (!isOwner(groupId)) {
    return (
      <div className="ht-group-settings">
        <h3 style={{ fontSize: 16, marginBottom: 12 }}>Group Settings</h3>
        <p className="ht-faint">Only the group owner can manage settings.</p>
      </div>
    );
  }

  async function handleRename(): Promise<void> {
    if (!user) return;
    setNameError(null);
    setError(null);

    if (!name.trim()) {
      setNameError('Group name cannot be empty');
      return;
    }

    setActionLoading(true);
    try {
      await renameGroup(groupId, name, user.uid);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename group');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!user) return;
    setError(null);

    if (deleteConfirmText !== currentName) {
      setError(`Type "${currentName}" to confirm`);
      return;
    }

    setActionLoading(true);
    try {
      await deleteGroup(groupId, user.uid);
      window.location.href = '/groups';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete group';
      console.error('Failed to delete group', { groupId, uid: user.uid, error: message });
      setError(message);
      setActionLoading(false);
    }
  }

  return (
    <div className="ht-group-settings">
      <h3 style={{ fontSize: 16, marginBottom: 16 }}>Group Settings</h3>

      {error && <p className="ht-error">{error}</p>}

      {/* Rename */}
      <div style={{ marginBottom: 20 }}>
        <label className="ht-field-label">Group name</label>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="ht-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleRename();
                if (e.key === 'Escape') {
                  setEditing(false);
                  setName(currentName);
                }
              }}
            />
            <button
              type="button"
              className="ht-btn ht-btn-sm ht-btn-primary"
              onClick={handleRename}
              disabled={actionLoading}
            >
              {actionLoading ? '...' : 'Save'}
            </button>
            <button
              type="button"
              className="ht-btn ht-btn-sm"
              onClick={() => {
                setEditing(false);
                setName(currentName);
              }}
              disabled={actionLoading}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{currentName}</span>
            <button
              type="button"
              className="ht-btn ht-btn-sm"
              onClick={() => setEditing(true)}
            >
              Rename
            </button>
          </div>
        )}
        {nameError && <p className="ht-error">{nameError}</p>}
      </div>

      {/* Delete */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
        <h4 style={{ fontSize: 14, color: 'var(--loss)', marginBottom: 8 }}>
          Danger Zone
        </h4>

        {confirmDelete ? (
          <div>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              Type <strong>{currentName}</strong> to confirm deletion. This cannot be undone.
            </p>
            <input
              type="text"
              className="ht-input"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={currentName}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="ht-btn ht-btn-sm ht-btn-danger"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete Group'}
              </button>
              <button
                type="button"
                className="ht-btn ht-btn-sm"
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteConfirmText('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="ht-btn ht-btn-sm ht-btn-danger"
            onClick={() => setConfirmDelete(true)}
          >
            Delete Group
          </button>
        )}
      </div>
    </div>
  );
}
