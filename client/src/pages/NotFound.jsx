import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found">
      <h1 className="not-found-code">404</h1>
      <p className="not-found-message">Page not found</p>
      <p className="not-found-sub">
        The page you are looking for does not exist.
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/projects')}>
        Go to Projects
      </button>
    </div>
  );
}