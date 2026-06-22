import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Generate from './pages/Generate';
import DocView from './pages/DocView';
import Compare from './pages/Compare';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/projects" element={
                <ProtectedRoute><Projects /></ProtectedRoute>
              } />
              <Route path="/projects/:id" element={
                <ProtectedRoute><ProjectDetail /></ProtectedRoute>
              } />
              <Route path="/projects/:id/generate" element={
                <ProtectedRoute><Generate /></ProtectedRoute>
              } />
              <Route path="/docs/:docId" element={
                <ProtectedRoute><DocView /></ProtectedRoute>
              } />
              <Route path="/docs/:docId/compare" element={
                <ProtectedRoute><Compare /></ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}