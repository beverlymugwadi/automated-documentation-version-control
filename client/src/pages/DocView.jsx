import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download, GitBranch, Edit, Save, X, RotateCcw } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Markdown from '../components/Markdown';
import { LoadingSpinner, ErrorState } from '../components/states/States';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import { timeAgo } from '../lib/time';

export default function DocView() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [doc, setDoc] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [changeMessage, setChangeMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [docId]);

  async function fetchData() {
    try {
      const [docRes, versionsRes] = await Promise.all([
        api.get(`/docs/${docId}`),
        api.get(`/docs/${docId}/versions`),
      ]);
      setDoc(docRes.data.doc);
      setVersions(versionsRes.data.versions);
    } catch {
      setError('Failed to load documentation.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    setEditContent(doc.content);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await api.put(`/docs/${docId}`, {
        content: editContent,
        changeMessage: changeMessage || 'Updated documentation',
      });
      setDoc(data.doc);
      setEditing(false);
      setChangeMessage('');
      toast.success('New version saved!');
      fetchData();
    } catch {
      toast.error('Failed to save version.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRollback(versionId) {
    if (!confirm('Rollback to this version?')) return;
    try {
      const { data } = await api.post(`/docs/${docId}/rollback/${versionId}`);
      setDoc(data.doc);
      toast.success('Rolled back successfully!');
      fetchData();
    } catch {
      toast.error('Rollback failed.');
    }
  }

  function handleExport(format) {
    window.open(
      `${import.meta.env.VITE_API_BASE_URL}/docs/${docId}/export?format=${format}`,
      '_blank'
    );
  }

  if (loading) return <AppShell><LoadingSpinner /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} /></AppShell>;

  return (
    <AppShell>
      <div className="page-header">
        <h1>{doc.title}</h1>
        <div className="header-actions">
          {!editing && (
            <>
              <button className="btn btn-secondary" onClick={startEdit}>
                <Edit size={16} /> Edit
              </button>
              <button className="btn btn-secondary" onClick={() => handleExport('markdown')}>
                <Download size={16} /> MD
              </button>
              <button className="btn btn-secondary" onClick={() => handleExport('pdf')}>
                <Download size={16} /> PDF
              </button>
              <button className="btn btn-secondary" onClick={() => handleExport('docx')}>
                <Download size={16} /> DOCX
              </button>
              <Link
                to={`/docs/${docId}/compare`}
                className="btn btn-secondary"
              >
                <GitBranch size={16} /> Compare
              </Link>
            </>
          )}
          {editing && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setEditing(false)}
              >
                <X size={16} /> Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Version'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="docview-grid">
        <div className="docview-main">
          {editing ? (
            <div className="edit-panel">
              <div className="field">
                <label>Change Message</label>
                <input
                  type="text"
                  value={changeMessage}
                  onChange={(e) => setChangeMessage(e.target.value)}
                  placeholder="What changed in this version?"
                />
              </div>
              <textarea
                className="edit-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={30}
              />
            </div>
          ) : (
            <div className="doc-content">
              <Markdown content={doc.content} />
            </div>
          )}
        </div>

        <div className="docview-sidebar">
          <h3 className="section-title">Version History</h3>
          <p className="version-meta">
            Current version: <strong>v{doc.currentVersion}</strong>
          </p>
          <div className="version-list">
            {versions.map((v) => (
              <div key={v.versionId} className="version-item">
                <div className="version-info">
                  <span className="version-number">v{v.versionNumber}</span>
                  <span className="version-message">{v.changeMessage}</span>
                  <span className="version-time">{timeAgo(v.createdAt)}</span>
                  <span className="version-hash">{v.commitHash.slice(0, 7)}</span>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => handleRollback(v.versionId)}
                  title="Rollback to this version"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}