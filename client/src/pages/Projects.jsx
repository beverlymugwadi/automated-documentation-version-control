import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Modal from '../components/ui/Modal';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/states/States';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import { timeAgo } from '../lib/time';

export default function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ projectName: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
    } catch {
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post('/projects', form);
      setProjects([data.project, ...projects]);
      setShowModal(false);
      setForm({ projectName: '', description: '' });
      toast.success('Project created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e, projectId) {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    setDeletingId(projectId);
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(projects.filter((p) => p.projectId !== projectId));
      toast.success('Project deleted.');
    } catch {
      toast.error('Failed to delete project.');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>Projects</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorState message={error} />}
      {!loading && !error && projects.length === 0 && (
        <EmptyState message="No projects yet. Create your first one!" />
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="card-grid">
          {projects.map((project) => (
            <div
              key={project.projectId}
              className="card"
              onClick={() => navigate(`/projects/${project.projectId}`)}
            >
              <div className="card-header">
                <h3 className="card-title">{project.projectName}</h3>
                <button
                  className="icon-btn"
                  onClick={(e) => handleDelete(e, project.projectId)}
                  disabled={deletingId === project.projectId}
                  title="Delete project"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {project.description && (
                <p className="card-desc">{project.description}</p>
              )}
              <p className="card-meta">Created {timeAgo(project.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="New Project" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label>Project Name</label>
              <input
                type="text"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                placeholder="My Awesome Project"
                required
              />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this project about?"
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}