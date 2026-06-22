import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../lib/hooks/useAuth';

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function AvatarMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="iconbtn"
        style={{ width: 'auto', padding: 2 }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="avatar" style={{ objectFit: 'cover' }} />
        ) : (
          <span className="avatar">{initials(user.fullName)}</span>
        )}
      </button>

      {open && (
        <div className="menu" role="menu">
          <div className="menu__head">
            <div style={{ fontWeight: 500 }}>{user.fullName}</div>
            <div className="muted" style={{ fontSize: 'var(--text-xs)' }}>{user.email}</div>
          </div>
          <div className="menu__sep" />
          <button className="menu__item" role="menuitem" onClick={() => { navigate('/dashboard'); setOpen(false); }}>
            <LayoutGrid size={15} /> Dashboard
          </button>
          <button className="menu__item" role="menuitem" onClick={() => { navigate('/dashboard'); setOpen(false); }}>
            <UserIcon size={15} /> Account
          </button>
          <div className="menu__sep" />
          <button className="menu__item" role="menuitem" onClick={() => { void logout(); navigate('/login'); }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
