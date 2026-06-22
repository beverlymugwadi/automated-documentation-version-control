import Topbar from './Topbar';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Topbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}