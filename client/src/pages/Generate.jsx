import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, Save } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export default function Generate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    title: '',
    notes: '',
    code: '',
    changeMessage: '',
  });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePreview() {
    if (!form.notes.trim()) {
      toast.error('Please enter some notes first.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/docs/preview', {
        title: form.title,
        notes: form.notes,
        code: form.code,
      });
      setPreview(data.markdown);
      toast.success('Preview generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate preview.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.notes.trim()) {
      toast.error('Please enter some notes first.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/docs', {
        projectId: id,
        title: form.title || 'Untitled Documentation',
        notes: form.notes,
        code: form.code,
        changeMessage: form.changeMessage || 'Initial documentation',
      });
      toast.success('Documentation saved!');
      navigate(`/docs/${data.doc.docId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save documentation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>Generate Documentation</h1>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={handlePreview}
            disabled={loading || !form.notes.trim()}
          >
            <Eye size={16} />
            {loading ? 'Generating...' : 'Preview'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !form.notes.trim()}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Documentation'}
          </button>
        </div>
      </div>

      <div className="generate-grid">
        <div className="generate-inputs">
          <div className="field">
            <label>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="My Module Documentation"
            />
          </div>

          <div className="field">
            <label>Developer Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={`Write your notes here. For example:\n\nThis module handles user authentication\nnpm install bcryptjs jsonwebtoken\nPOST /api/auth/login returns a JWT token\nthrows 401 if credentials are invalid`}
              rows={10}
            />
          </div>

          <div className="field">
            <label>Source Code (optional)</label>
            <textarea
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Paste your JavaScript or TypeScript code here..."
              rows={10}
              className="code-textarea"
            />
          </div>

          <div className="field">
            <label>Change Message (optional)</label>
            <input
              type="text"
              value={form.changeMessage}
              onChange={(e) => setForm({ ...form, changeMessage: e.target.value })}
              placeholder="Initial documentation"
            />
          </div>
        </div>

        <div className="generate-preview">
          <h2 className="section-title">Preview</h2>
          {preview ? (
            <pre className="markdown-preview">{preview}</pre>
          ) : (
            <div className="preview-empty">
              Click Preview to see your generated documentation here
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}