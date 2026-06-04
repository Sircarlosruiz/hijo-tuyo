import type { ReactNode } from 'react';
import { useAuth } from '../hooks/use-auth';
import { Avatar, BrandMark, Icon } from './ui';

interface AppShellProps {
  children: ReactNode;
  activePage: 'dashboard' | 'log' | 'profile';
}

const NAV = [
  { key: 'dashboard' as const, icon: 'standings', label: 'Standings', href: '/dashboard' },
  { key: 'log' as const,       icon: 'plus',      label: 'Log Match',  href: '/match-entry' },
  { key: 'profile' as const,   icon: 'user',      label: 'Profile',    href: '/profile' },
];

export function AppShell({ children, activePage }: AppShellProps): React.JSX.Element {
  const { user } = useAuth();
  const displayName = user?.displayName ?? 'Player';
  const uid = user?.uid ?? '';
  const photoURL = user?.photoURL ?? undefined;

  return (
    <div className="ht-app">
      {/* desktop sidebar */}
      <aside className="ht-sidebar">
        <div className="ht-brand">
          <BrandMark />
          <div className="ht-brand-name">
            HIJO TUYO
            <span className="ht-lo">Settle it. On the board.</span>
          </div>
        </div>

        <nav className="ht-nav">
          {NAV.map((n) => (
            <a
              key={n.key}
              href={n.href}
              className={`ht-nav-item ${activePage === n.key ? 'active' : ''}`}
            >
              <Icon name={n.icon} className="ht-nav-ico" />
              {n.label}
            </a>
          ))}
        </nav>

        <div className="ht-sidebar-foot">
          <a href="/profile" className="ht-nav-item" style={{ gap: 11 }}>
            <Avatar uid={uid} displayName={displayName} photoURL={photoURL} size={30} isYou />
            <span className="ht-grow" style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                {displayName}
              </span>
              <span style={{ display: 'block', fontSize: 11.5 }} className="ht-faint">Profile</span>
            </span>
          </a>
        </div>
      </aside>

      {/* mobile top bar */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <header className="ht-topbar">
          <div className="ht-row ht-gap8">
            <BrandMark size={30} />
            <span className="ht-brand-name" style={{ fontSize: 16 }}>HIJO TUYO</span>
          </div>
          <a href="/profile" style={{ background: 'none', border: 'none', padding: 0 }}>
            <Avatar uid={uid} displayName={displayName} photoURL={photoURL} size={34} ring isYou />
          </a>
        </header>

        <main className="ht-main">
          <div className="ht-main-inner">{children}</div>
        </main>
      </div>

      {/* mobile tab bar */}
      <nav className="ht-tabbar">
        {NAV.map((n) => (
          <a
            key={n.key}
            href={n.href}
            className={`ht-tab ${n.key === 'log' ? 'cta' : ''} ${activePage === n.key ? 'active' : ''}`}
          >
            <Icon name={n.icon} className="ht-nav-ico" />
            {n.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
