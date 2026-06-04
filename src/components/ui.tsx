/* Shared design-system primitives for Hijo Tuyo */

import { useEffect, useState } from 'react';

const PLAYER_COLORS = ['#38f58b', '#ff3df0', '#34d6ff', '#ffd34e', '#a78bfa', '#fb7185', '#f97316'];

function uidColor(uid: string): string {
  let h = 5381;
  for (let i = 0; i < uid.length; i++) h = ((h * 33) ^ uid.charCodeAt(i)) >>> 0;
  return PLAYER_COLORS[h % PLAYER_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? '?').toUpperCase();
}

interface AvatarProps {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  size?: number;
  ring?: boolean;
  glow?: boolean;
  isYou?: boolean;
}

export function Avatar({ uid, displayName, photoURL, size = 40, ring, glow, isYou }: AvatarProps): React.JSX.Element {
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoURL]);

  const color = isYou ? 'var(--accent)' : uidColor(uid);
  const fontSize = size * 0.38;
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize,
    background: color,
    border: ring ? `2px solid ${color}` : '1.5px solid var(--line-strong)',
    flexShrink: 0,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    color: isYou ? 'var(--accent-ink)' : '#fff',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: glow ? `0 0 18px color-mix(in srgb, ${color} 55%, transparent)` : undefined,
  };

  const showPhoto = Boolean(photoURL) && !photoFailed;

  if (showPhoto) {
    return (
      <div style={style}>
        <img
          src={photoURL!}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setPhotoFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  return <div style={style}>{initials(displayName)}</div>;
}

/* ---- Icons (simple line glyphs) ---- */
interface IconProps {
  name: string;
  style?: React.CSSProperties;
  className?: string;
}

export function Icon({ name, style, className }: IconProps): React.JSX.Element {
  const p = { fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const icons: Record<string, React.ReactNode> = {
    standings: <><path {...p} d="M8 21h8M12 17v4" /><path {...p} d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path {...p} d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
    plus: <path {...p} d="M12 5v14M5 12h14" />,
    user: <><circle {...p} cx="12" cy="8" r="4" /><path {...p} d="M5 21a7 7 0 0 1 14 0" /></>,
    swords: <><path {...p} d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M4.5 17.5 16 6V3h-3L1.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2" /></>,
    fire: <path {...p} d="M12 3c1 3-1 4-1 6 0 1 1 2 1 2s2-1 2-3c2 1 3 3.5 3 6a5 5 0 0 1-10 0c0-3 2-4 2-7 0-2 2-3 3-4Z" />,
    snow: <><path {...p} d="M12 2v20M4 7l16 10M20 7 4 17" /></>,
    check: <path {...p} d="m4 12 5 5L20 6" />,
    x: <><path {...p} d="M6 6l12 12M18 6 6 18" /></>,
    chevron: <path {...p} d="m9 6 6 6-6 6" />,
    google: <g>
      <path fill="#4285F4" d="M21.6 12.2c0-.6-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.2Z"/>
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/>
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z"/>
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.6 9.4 5.9 12 5.9Z"/>
    </g>,
    signout: <><path {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline {...p} points="16 17 21 12 16 7" /><line {...p} x1="21" y1="12" x2="9" y2="12" /></>,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      style={{ width: 20, height: 20, flexShrink: 0, ...style }}
      className={className}
      aria-hidden="true"
    >
      {icons[name] ?? null}
    </svg>
  );
}

/* ---- WinBar ---- */
interface WinBarProps { rate: number; }
export function WinBar({ rate }: WinBarProps): React.JSX.Element {
  return (
    <div className="ht-wbar">
      <i style={{ width: `${rate * 100}%` }} />
    </div>
  );
}

/* ---- Record pill ---- */
interface RecordProps { wins: number; losses: number; size?: 'sm' | 'md' | 'lg'; }
export function RecordPill({ wins, losses, size = 'md' }: RecordProps): React.JSX.Element {
  const sz = size === 'lg' ? 18 : size === 'sm' ? 12 : 14;
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: sz, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--win)' }}>{wins}</span>
      <span style={{ color: 'var(--text-faint)', margin: '0 3px' }}>–</span>
      <span style={{ color: 'var(--loss)' }}>{losses}</span>
    </span>
  );
}

/* ---- Streak badge ---- */
interface StreakBadgeProps { streak: { type: 'W' | 'L' | null; count: number }; }
export function StreakBadge({ streak }: StreakBadgeProps): React.JSX.Element | null {
  if (!streak.type || streak.count < 2) return null;
  const isHot = streak.type === 'W' && streak.count >= 3;
  const isCold = streak.type === 'L' && streak.count >= 3;
  const cls = isHot ? 'ht-badge ht-badge-hot' : isCold ? 'ht-badge ht-badge-cold' : streak.type === 'W' ? 'ht-badge ht-badge-win' : 'ht-badge ht-badge-loss';
  return (
    <span className={cls}>
      {isHot ? <Icon name="fire" style={{ width: 11, height: 11 }} /> : isCold ? <Icon name="snow" style={{ width: 11, height: 11 }} /> : null}
      {streak.type}{streak.count}
    </span>
  );
}

/* ---- BrandMark ---- */
interface BrandMarkProps { size?: number; }
export function BrandMark({ size = 38 }: BrandMarkProps): React.JSX.Element {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.29,
      display: 'grid', placeItems: 'center',
      background: 'var(--accent)',
      color: 'var(--accent-ink)',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: size * 0.58,
      boxShadow: '0 0 20px rgba(56,245,139,0.55)',
      transform: 'skewX(-6deg)',
      flexShrink: 0,
    }}>
      H
    </div>
  );
}

export { uidColor, initials };
