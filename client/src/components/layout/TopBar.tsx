import { NavLink } from 'react-router-dom';
import { Diamond, Search } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { AvatarMenu } from './AvatarMenu';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'topnav__link topnav__link--active' : 'topnav__link';

export function TopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  return (
    <header className="topbar">
      <NavLink to="/dashboard" className="wordmark" aria-label="ADGVC home">
        <Diamond size={15} className="wordmark__diamond" fill="currentColor" />
        ADGVC
      </NavLink>

      <nav className="topnav" aria-label="Primary">
        <NavLink to="/dashboard" end className={navClass}>Dashboard</NavLink>
        <NavLink to="/projects" className={navClass}>Projects</NavLink>
        <NavLink to="/repos" className={navClass}>Repositories</NavLink>
      </nav>

      <span className="spacer" />

      <button className="cmdk-trigger" onClick={onOpenCommand} aria-label="Open command palette">
        <Search size={14} />
        <span>Search or jump to…</span>
        <span className="cmdk-trigger__keys">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <ThemeToggle />
      <AvatarMenu />
    </header>
  );
}