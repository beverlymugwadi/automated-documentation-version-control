import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Still checking localStorage — don't redirect yet
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  // Not logged in — send to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in — render the page
  return children;
}