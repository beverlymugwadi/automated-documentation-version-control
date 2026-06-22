import { NavLink } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink
          to="/projects"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
          }
        >
          <FolderOpen size={18} />
          Projects
        </NavLink>
      </nav>
    </aside>
  );
}