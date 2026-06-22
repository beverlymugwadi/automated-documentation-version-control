import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, LayoutGrid, FileText, FilePlus2, FolderGit2, SunMoon, LogOut, CornerDownLeft } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAuth } from '../lib/hooks/useAuth';
import { listDocs } from '../lib/docs';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const toggleTheme = useThemeStore((s) => s.toggle);
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: docs } = useQuery({ queryKey: ['docs'], queryFn: listDocs, enabled: open });

  const commands = useMemo<Command[]>(() => {
    const close = () => onOpenChange(false);
    const base: Command[] = [
      { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutGrid, run: () => { navigate('/dashboard'); close(); } },
      { id: 'projects', label: 'Go to Projects', icon: FolderGit2, run: () => { navigate('/projects'); close(); } },
      { id: 'repos', label: 'Browse repositories', icon: FolderGit2, run: () => { navigate('/repos'); close(); } },
      { id: 'new', label: 'New document', hint: 'Notes + code → docs', icon: FilePlus2, run: () => { navigate('/transform'); close(); } },
      { id: 'theme', label: 'Toggle theme', icon: SunMoon, run: () => { toggleTheme(); close(); } },
      { id: 'logout', label: 'Sign out', icon: LogOut, run: () => { void logout(); navigate('/login'); close(); } },
    ];
    const docCmds: Command[] = (docs ?? []).map((d) => ({
      id: `doc-${d.docId}`,
      label: d.title,
      hint: `v${d.currentVersion}`,
      icon: FileText,
      run: () => { navigate(`/docs/${d.docId}`); close(); },
    }));
    return [...base, ...docCmds];
  }, [navigate, toggleTheme, logout, onOpenChange, docs]);

  const filtered = useMemo(
    () => commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpenChange(!open); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onOpenChange(false);
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.run(); }
  };

  return createPortal(
    <div className="ui-overlay" style={{ alignItems: 'flex-start', paddingTop: '12vh' }} onMouseDown={(e) => e.target === e.currentTarget && onOpenChange(false)}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKeyDown}>
        <div className="cmdk__search">
          <Search size={16} className="muted" />
          <input ref={inputRef} className="cmdk__input" placeholder="Type a command or search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <span className="kbd">esc</span>
        </div>
        <ul className="cmdk__list" role="listbox">
          {filtered.length === 0 && <li className="cmdk__empty">No commands match "{query}".</li>}
          {filtered.map((c, i) => {
            const Icon = c.icon;
            return (
              <li key={c.id} role="option" aria-selected={i === active} className={i === active ? 'cmdk__item cmdk__item--active' : 'cmdk__item'} onMouseEnter={() => setActive(i)} onClick={() => c.run()}>
                <Icon size={16} className="cmdk__item-icon" />
                <span className="cmdk__item-label">{c.label}</span>
                {c.hint && <span className="cmdk__item-hint">{c.hint}</span>}
                {i === active && <CornerDownLeft size={14} className="cmdk__item-enter" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}