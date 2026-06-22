import { Loader, FolderOpen, AlertCircle } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="state-container">
      <Loader size={32} className="spinner" />
      <p>Loading...</p>
    </div>
  );
}

export function EmptyState({ message = 'Nothing here yet.' }) {
  return (
    <div className="state-container">
      <FolderOpen size={48} className="state-icon" />
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="state-container">
      <AlertCircle size={48} className="state-icon state-icon--error" />
      <p>{message}</p>
    </div>
  );
}