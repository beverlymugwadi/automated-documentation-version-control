import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { CommandPalette } from '../CommandPalette';

export function AppShell() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="shell">
      <TopBar onOpenCommand={() => setCmdOpen(true)} />
      <main className="shell__main">
        <Outlet />
      </main>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}