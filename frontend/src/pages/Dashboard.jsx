import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/projects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

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
        <div className="topbar">
          <h2>Dashboard</h2>
          <button className="btn-primary" onClick={() => navigate('/new-project')}>
            + New Project
          </button>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Projects</div>
            <div className="stat-value purple">{projects.length}</div>
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

        {loading ? (
          <div className="empty-state">
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>No projects yet. Click <strong>+ New Project</strong> to get started.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project._id} className="project-card">
                <div className="project-name">📦 {project.projectName}</div>
                <div className="project-desc">{project.description || 'No description'}</div>
                <div className="project-meta">
                  <span className="tag">{project.language}</span>
                  <span className="project-date">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}