import { useState } from 'react';
import { useActiveGroup } from '../hooks/use-active-group';

interface GroupSwitcherProps {
  className?: string;
}

export function GroupSwitcher({ className }: GroupSwitcherProps): React.JSX.Element {
  const { groups, activeGroupId, setActiveGroup, loading } = useActiveGroup();
  const [open, setOpen] = useState<boolean>(false);

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  if (loading) {
    return <div className="ht-group-switcher-loading">Loading groups...</div>;
  }

  if (groups.length === 0) {
    return <div className="ht-group-switcher-empty">No groups</div>;
  }

  return (
    <div className={`ht-group-switcher ${className ?? ''}`}>
      <button
        type="button"
        className="ht-group-switcher-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="ht-group-switcher-name">{activeGroup?.name ?? 'Select group'}</span>
        <span className="ht-group-switcher-chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="ht-group-switcher-dropdown">
          <ul className="ht-group-switcher-list" role="listbox" aria-label="Your groups">
            {groups.map((group) => (
              <li key={group.id} role="option" aria-selected={group.id === activeGroupId}>
                <button
                  type="button"
                  className={`ht-group-switcher-item ${group.id === activeGroupId ? 'active' : ''}`}
                  onClick={() => {
                    void setActiveGroup(group.id);
                    setOpen(false);
                  }}
                >
                  <span className="ht-group-switcher-item-name">{group.name}</span>
                  {group.myRole === 'owner' && (
                    <span className="ht-group-switcher-owner-badge">Owner</span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="ht-group-switcher-footer">
            <button
              type="button"
              className="ht-group-switcher-item ht-group-switcher-create"
              onClick={() => {
                window.location.href = '/groups/new';
              }}
            >
              <span className="ht-group-switcher-item-name">+ Create new group</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
