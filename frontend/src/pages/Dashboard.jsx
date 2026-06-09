import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <h1>ADGVC</h1>
          <p>Documentation Generator</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Main</div>
          <div className="nav-item active">🏠 Dashboard</div>
          <div className="nav-item" onClick={() => navigate('/generate')}>⚡ Generate Docs</div>
          <div className="nav-item" onClick={() => navigate('/documents')}>📄 My Documents</div>
          <div className="nav-item" onClick={() => navigate('/versions')}>🕐 Version History</div>

          <div className="nav-section">Integrations</div>
          <div className="nav-item" onClick={() => navigate('/github')}>🔗 GitHub Connect</div>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-pill">
            <div className="avatar">{user?.fullName?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user?.fullName}</div>
              <div className="user-role">Developer</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <div className="topbar">
          <h2>Dashboard</h2>
          <button className="btn-primary" onClick={() => navigate('/generate')}>
            + New Project
          </button>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Projects</div>
            <div className="stat-value purple">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Docs Generated</div>
            <div className="stat-value green">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Versions Saved</div>
            <div className="stat-value blue">0</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Exports Done</div>
            <div className="stat-value amber">0</div>
          </div>
        </div>

        {/* Projects */}
        <div className="section-header">
          <h3>Recent Projects</h3>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <p>No projects yet. Click <strong>+ New Project</strong> to get started.</p>
        </div>
      </div>
    </div>
  );
}