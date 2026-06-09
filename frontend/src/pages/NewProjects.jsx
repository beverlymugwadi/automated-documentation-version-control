import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function NewProject() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    language: 'JavaScript',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.projectName) {
      return setError('Project name is required.');
    }

    try {
      setLoading(true);

      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create project.');
      }

      // Redirect to dashboard after creating project
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <div className="nav-item" onClick={() => navigate('/dashboard')}>🏠 Dashboard</div>
          <div className="nav-item active">⚡ Generate Docs</div>
          <div className="nav-item" onClick={() => navigate('/documents')}>📄 My Documents</div>
          <div className="nav-item" onClick={() => navigate('/versions')}>🕐 Version History</div>
          <div className="nav-section">Integrations</div>
          <div className="nav-item" onClick={() => navigate('/github')}>🔗 GitHub Connect</div>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-pill">
            <div className="avatar">
              {JSON.parse(localStorage.getItem('user'))?.fullName?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{JSON.parse(localStorage.getItem('user'))?.fullName}</div>
              <div className="user-role">Developer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="topbar">
          <h2>New Project</h2>
          <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
        </div>

        <div className="form-content">
          <p className="breadcrumb">Dashboard › <span>New Project</span></p>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="projectName">Project Name *</label>
              <input
                id="projectName"
                name="projectName"
                type="text"
                placeholder="e.g. E-Commerce API"
                value={formData.projectName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                placeholder="Brief description of this project..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                name="language"
                value={formData.language}
                onChange={handleChange}
              >
                <option>JavaScript</option>
                <option>TypeScript</option>
              </select>
            </div>

            <div className="info-box">
              💡 Tip: After creating the project, you can connect it to a
              GitHub repository from the GitHub Connect page.
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project & Start Documenting →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}