import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, FileText, ArrowLeft } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/states/States';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import { timeAgo } from '../lib/time';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [projectRes, docsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/docs?projectId=${id}`),
      ]);
      setProject(projectRes.data.project);
      setDocs(docsRes.data.docs);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <AppShell><LoadingSpinner /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} /></AppShell>;

  return (
    <AppShell>
      <div className="page-header">
        <div className="page-header-left">
          <button className="icon-btn" onClick={() => navigate('/projects')}>
            <ArrowLeft size={20} />
          </button>
          <h1>{project.projectName}</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/projects/${id}/generate`)}
        >
          <Plus size={16} /> Generate Docs
        </button>
      </div>

      {project.description && (
        <p className="project-desc">{project.description}</p>
      )}

      <h2 className="section-title">Documentation</h2>

      {docs.length === 0 ? (
        <EmptyState message="No documentation yet. Click Generate Docs to create some!" />
      ) : (
        <div className="doc-list">
          {docs.map((doc) => (
            <Link
              key={doc.docId}
              to={`/docs/${doc.docId}`}
              className="doc-item"
            >
              <div className="doc-item-left">
                <FileText size={18} />
                <div>
                  <p className="doc-item-title">{doc.title}</p>
                  <p className="doc-item-meta">
                    Version {doc.currentVersion} · {timeAgo(doc.updatedAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}