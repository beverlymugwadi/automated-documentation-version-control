import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Save, GitCompare, RotateCcw, FileText, History, Github, RefreshCw, FlaskConical } from 'lucide-react';
import { Button, Badge, Modal } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { CommitRail } from '../components/CommitRail';
import { DiffView } from '../components/DiffView';
import { ExportMenu } from '../components/ExportMenu';
import { FeedbackWidget } from '../components/FeedbackWidget';
import { Contributors } from '../components/Contributors';
import { DriftBanner } from '../components/DriftBanner';
import { CommitToGitHubModal } from '../components/CommitToGitHubModal';
import { LoadingState, ErrorState } from '../components/states/States';
import { getDoc } from '../lib/docs';
import { fetchVersions, fetchVersionContent, fetchDiff, saveVersion, rollback, type Diff } from '../lib/versions';
import { checkDrift, simulateDrift, regenerateDoc, type ChangedFile } from '../lib/drift';
import { toast } from '../routes/store/toastStore';

type Mode = 'view' | 'edit' | 'compare';

export function DocWorkspace() {
  const { docId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const docQuery = useQuery({ queryKey: ['doc', docId], queryFn: () => getDoc(docId) });
  const versionsQuery = useQuery({ queryKey: ['versions', docId], queryFn: () => fetchVersions(docId) });

  const [mode, setMode] = useState<Mode>('view');
  const [viewing, setViewing] = useState<number | null>(null);
  const [shownContent, setShownContent] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const [diff, setDiff] = useState<Diff | null>(null);
  const [rollbackTo, setRollbackTo] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [worstState, setWorstState] = useState<import('../lib/drift').DriftState>('current');
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [highlight, setHighlight] = useState<number | undefined>(undefined);
  const [commitOpen, setCommitOpen] = useState(false);

  const doc = docQuery.data;
  const versions = versionsQuery.data ?? [];
  const activeVersion = viewing ?? doc?.currentVersion ?? 1;
  const hasBindings = (doc?.sourceBindings?.length ?? 0) > 0;

  useEffect(() => { if (doc && viewing === null) setShownContent(doc.content); }, [doc, viewing]);

  useEffect(() => {
    if (versions.length >= 2 && from === null) { setFrom(versions[1].versionNo); setTo(versions[0].versionNo); }
  }, [versions, from]);

  async function selectVersion(no: number) {
    if (no === (doc?.currentVersion ?? -1)) { setViewing(null); setShownContent(doc?.content ?? ''); return; }
    const content = await fetchVersionContent(docId, no);
    setViewing(no); setShownContent(content);
  }

  async function onSave() {
    setSaving(true);
    try {
      await saveVersion(docId, draft, 'Manual edit');
      toast.success('Saved as a new version');
      setMode('view'); setViewing(null);
      await qc.invalidateQueries({ queryKey: ['doc', docId] });
      await qc.invalidateQueries({ queryKey: ['versions', docId] });
    } catch { toast.error('Could not save version'); }
    finally { setSaving(false); }
  }

  async function runDiff() {
    if (!from || !to) return;
    setDiff(await fetchDiff(docId, from, to));
  }
  useEffect(() => { if (mode === 'compare' && from && to) void runDiff(); }, [mode, from, to]); // eslint-disable-line

  async function onRollback() {
    if (rollbackTo === null) return;
    setRolling(true);
    try {
      await rollback(docId, rollbackTo);
      toast.success(`Rolled back to v${rollbackTo}`);
      setRollbackTo(null); setViewing(null);
      await qc.invalidateQueries({ queryKey: ['doc', docId] });
      await qc.invalidateQueries({ queryKey: ['versions', docId] });
    } catch { toast.error('Rollback failed'); }
    finally { setRolling(false); }
  }

  async function runDriftCheck(announce = false) {
    if (!hasBindings) return;
    setChecking(true);
    try {
      const result = await checkDrift(docId);
      setChangedFiles(result.changedFiles);
      setWorstState(result.worstState ?? (result.isOutdated ? 'implementation_changed' : 'current'));
      if (announce) {
        if (!result.isOutdated) toast.success('Documentation is up to date');
        else if (result.worstState === 'signature_changed') toast.info('API signatures changed upstream');
        else toast.info('Source updated upstream — API surface unchanged');
      }
    } catch { /* drift is best-effort */ }
    finally { setChecking(false); }
  }

  useEffect(() => {
    if (!hasBindings) return undefined;
    void runDriftCheck();
    const id = window.setInterval(() => void runDriftCheck(), 60_000);
    return () => window.clearInterval(id);
  }, [docId, hasBindings]); // eslint-disable-line

  async function onSimulateDrift() {
    try { await simulateDrift(docId); await runDriftCheck(); toast.info('Simulated an upstream change'); }
    catch { toast.error('Could not simulate drift'); }
  }

  async function onRegenerate() {
    setUpdating(true);
    try {
      const res = await regenerateDoc(docId);
      setChangedFiles([]); setWorstState('current'); setViewing(null); setHighlight(res.version?.versionNo);
      await qc.invalidateQueries({ queryKey: ['doc', docId] });
      await qc.invalidateQueries({ queryKey: ['versions', docId] });
      if (res.llmMarkdown) {
        toast.success('Documentation updated (AI-enhanced)', `New version v${res.version?.versionNo}`);
      } else {
        toast.success('Documentation updated', `New version v${res.version?.versionNo}${res.llmError ? ' — AI unavailable: ' + res.llmError : ''}`);
      }
    } catch { toast.error('Could not regenerate'); }
    finally { setUpdating(false); }
  }

  const versionOptions = useMemo(() => versions.map((v) => v.versionNo), [versions]);

  if (docQuery.isLoading) return <div className="container"><LoadingState label="Loading document" /></div>;
  if (docQuery.isError || !doc) return <div className="container"><ErrorState desc="Could not load this document." action={<Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>} /></div>;

  const isHistorical = viewing !== null && viewing !== doc.currentVersion;

  return (
    <div className="container container--wide">
      <div className="row row--between" style={{ flexWrap: 'wrap', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
        <div>
          <div className="row" style={{ gap: 'var(--sp-2)' }}>
            <h1 style={{ fontSize: 'var(--text-2xl)' }}>{doc.title}</h1>
            <Badge tone="signal" mono>v{doc.currentVersion}</Badge>
            {worstState === 'signature_changed' && <Badge tone="remove" dot>Signatures changed</Badge>}
            {worstState === 'implementation_changed' && <Badge tone="amber" dot>Updated upstream</Badge>}
          </div>
          <div className="row" style={{ gap: 'var(--sp-3)', marginTop: 6, flexWrap: 'wrap' }}>
            {doc.sourceRepo && <span className="muted mono" style={{ fontSize: 'var(--text-sm)' }}>{doc.sourceRepo}</span>}
            <Contributors versions={versions} />
          </div>
        </div>
        <div className="row" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <div className="doc-toggle">
            <button className={mode === 'view' ? 'active' : ''} onClick={() => setMode('view')}>Document</button>
            <button className={mode === 'compare' ? 'active' : ''} onClick={() => setMode('compare')}>Compare</button>
          </div>
          {hasBindings && <Button size="sm" variant="ghost" leftIcon={<RefreshCw size={14} />} loading={checking} onClick={() => runDriftCheck(true)}>Check for updates</Button>}
          {hasBindings && <Button size="sm" variant="ghost" leftIcon={<FlaskConical size={14} />} onClick={onSimulateDrift} title="Simulate an upstream source change (dev tool)">Simulate change</Button>}
          {mode === 'view' && !isHistorical && <Button size="sm" variant="secondary" leftIcon={<Pencil size={14} />} onClick={() => { setDraft(doc.content); setMode('edit'); }}>Edit</Button>}
          <Button size="sm" variant="secondary" leftIcon={<Github size={14} />} onClick={() => setCommitOpen(true)}>Commit to GitHub</Button>
          <ExportMenu docId={docId} />
        </div>
      </div>

      {worstState !== 'current' && <DriftBanner worstState={worstState} changedFiles={changedFiles} onUpdate={onRegenerate} updating={updating} />}

      <div className="workspace">
        <div className="workspace__main">
          {mode === 'edit' ? (
            <div className="stack-3">
              <MarkdownEditor value={draft} onChange={setDraft} />
              <div className="row row--between">
                <span className="faint" style={{ fontSize: 'var(--text-sm)' }}>Saving creates a new version + commit.</span>
                <div className="row">
                  <Button size="sm" variant="ghost" onClick={() => setMode('view')}>Cancel</Button>
                  <Button size="sm" variant="primary" leftIcon={<Save size={14} />} loading={saving} disabled={draft === doc.content} onClick={onSave}>Save version</Button>
                </div>
              </div>
            </div>
          ) : mode === 'compare' ? (
            <div className="stack-4">
              <div className="row" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                <label className="row" style={{ gap: 'var(--sp-2)' }}>
                  <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Base</span>
                  <select className="select" value={from ?? ''} onChange={(e) => setFrom(Number(e.target.value))}>
                    {versionOptions.map((v) => <option key={v} value={v}>v{v}</option>)}
                  </select>
                </label>
                <GitCompare size={16} className="muted" />
                <label className="row" style={{ gap: 'var(--sp-2)' }}>
                  <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Compare</span>
                  <select className="select" value={to ?? ''} onChange={(e) => setTo(Number(e.target.value))}>
                    {versionOptions.map((v) => <option key={v} value={v}>v{v}</option>)}
                  </select>
                </label>
              </div>
              {versions.length < 2 ? (
                <ErrorState title="Not enough history" desc="A document needs at least two versions to compare. Edit it to create another." />
              ) : (
                <DiffView diff={diff} from={from ?? 0} to={to ?? 0} />
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--sp-6) var(--sp-7)' }}>
              {isHistorical && (
                <div className="row row--between" style={{ marginBottom: 'var(--sp-4)' }}>
                  <Badge tone="amber" dot>Viewing v{viewing} (historical)</Badge>
                  <div className="row">
                    <Button size="sm" variant="ghost" onClick={() => selectVersion(doc.currentVersion)}>Back to latest</Button>
                    <Button size="sm" variant="secondary" leftIcon={<RotateCcw size={14} />} onClick={() => setRollbackTo(viewing)}>Restore this version</Button>
                  </div>
                </div>
              )}
              <Markdown content={shownContent} />
            </div>
          )}
        </div>

        <aside className="workspace__rail">
          <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
            <History size={15} className="muted" />
            <strong style={{ fontSize: 'var(--text-sm)' }}>Version history</strong>
          </div>
          {versionsQuery.isLoading ? <LoadingState label="Loading versions" /> : versions.length === 0 ? (
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>No versions yet.</p>
          ) : (
            <CommitRail versions={versions} activeVersion={activeVersion} highlightVersion={highlight} onSelect={selectVersion} />
          )}
        </aside>
      </div>

      <Modal open={rollbackTo !== null} title={`Restore v${rollbackTo}?`} onClose={() => setRollbackTo(null)}
        footer={<><Button variant="ghost" onClick={() => setRollbackTo(null)}>Cancel</Button><Button variant="primary" leftIcon={<RotateCcw size={15} />} loading={rolling} onClick={onRollback}>Restore version</Button></>}>
        <p>Rollback is non-destructive — it restores the content of v{rollbackTo} as a new version (v{(doc.currentVersion) + 1}). Your full history is preserved.</p>
      </Modal>

      <CommitToGitHubModal
        open={commitOpen}
        onClose={() => setCommitOpen(false)}
        docId={docId}
        title={doc.title}
        defaultRepo={doc.sourceRepo}
        defaultBranch={doc.sourceBindings?.[0]?.branch ?? null}
        firstSourcePath={doc.sourceBindings?.[0]?.path ?? null}
        onCommitted={() => qc.invalidateQueries({ queryKey: ['versions', docId] })}
      />

      <div style={{ marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--line)' }}>
        <FeedbackWidget docId={docId} />
      </div>
    </div>
  );
}