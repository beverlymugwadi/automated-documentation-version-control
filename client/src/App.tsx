import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './lib/hooks/useAuth';
import { Toaster } from './components/ui';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Repos } from './pages/Repos';
import { RepoDetail } from './pages/RepoDetail';
import { Transform } from './pages/Transform';
import { DocWorkspace } from './pages/DocWorkspace';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Account } from './pages/Account';
import { AuthCallback } from './pages/AuthCallback';

function Root() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* GitHub OAuth token-handoff — must be public (no ProtectedRoute wrapper) */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/repos" element={<Repos />} />
          <Route path="/repos/:owner/:repo" element={<RepoDetail />} />
          <Route path="/transform" element={<Transform />} />
          <Route path="/docs/:docId" element={<DocWorkspace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/account" element={<Account />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}