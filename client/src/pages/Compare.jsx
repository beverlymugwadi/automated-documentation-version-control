import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import DiffView from '../components/DiffView';
import { LoadingSpinner, ErrorState } from '../components/states/States';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export default function Compare() {
  const { docId } = useParams();
  const toast = useToast();

  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [v1, setV1] = useState('');
  const [v2, setV2] = useState('');
  const [hunks, setHunks] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [docId]);

  async function fetchVersions() {
    try {
      const { data } = await api.get(`/docs/${docId}/versions`);
      setVersions(data.versions);
      if (data.versions.length >= 2) {
        setV1(data.versions[data.versions.length - 1].commitHash);
        setV2(data.versions[0].commitHash);
      }
    } catch {
      setError('Failed to load versions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCompare() {
    if (!v1 || !v2) {
      toast.error('Please select two versions to compare.');
      return;
    }
    if (v1 === v2) {
      toast.error('Please select two different versions.');
      return;
    }
    setComparing(true);
    try {
      const { data } = await api.get(`/docs/${docId}/diff?v1=${v1}&v2=${v2}`);
      setHunks(data.hunks);
    } catch {
      toast.error('Failed to compare versions.');
    } finally {
      setComparing(false);
    }
  }

  if (loading) return <AppShell><LoadingSpinner /></AppShell>;
  if (error) return <AppShell><ErrorState message={error} /></AppShell>;

  return (
    <AppShell>
      <div className="page-header">
        <h1>Compare Versions</h1>
      </div>

      <div className="compare-controls">
        <div className="compare-selects">
          <div className="field">
            <label>From Version</label>
            <select
              value={v1}
              onChange={(e) => setV1(e.target.value)}
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.versionId} value={v.commitHash}>
                  v{v.versionNumber} — {v.changeMessage} ({v.commitHash.slice(0, 7)})
                </option>
              ))}
            </select>
          </div>

          <div className="compare-arrow">→</div>

          <div className="field">
            <label>To Version</label>
            <select
              value={v2}
              onChange={(e) => setV2(e.target.value)}
            >
              <option value="">Select version...</option>
              {versions.map((v) => (
                <option key={v.versionId} value={v.commitHash}>
                  v{v.versionNumber} — {v.changeMessage} ({v.commitHash.slice(0, 7)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCompare}
          disabled={comparing || !v1 || !v2}
        >
          <GitCompare size={16} />
          {comparing ? 'Comparing...' : 'Compare'}
        </button>
      </div>

      {hunks === null && (
        <div className="compare-placeholder">
          Select two versions above and click Compare to see the differences
        </div>
      )}

      {hunks !== null && (
        <div className="compare-result">
          <p className="compare-summary">
            Showing diff between{' '}
            <code>{v1.slice(0, 7)}</code> and <code>{v2.slice(0, 7)}</code>
          </p>
          <DiffView hunks={hunks} />
        </div>
      )}
    </AppShell>
  );
}