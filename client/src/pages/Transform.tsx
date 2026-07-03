import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, NotebookPen, FileCode2, ChevronDown, ChevronRight, X, FileText, Pencil, Save, Clock, Wand2, Layers, FolderGit2 } from 'lucide-react';
import { Button, Badge, Tooltip, Input } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { CodeBlock, langFromPath } from '../components/CodeBlock';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { PipelineConnector } from '../components/PipelineConnector';
import { ExportMenu } from '../components/ExportMenu';
import { EmptyState } from '../components/states/States';
import { useStagedStore } from '../routes/store/stagedStore';
import { generateDoc } from '../lib/generate';
import { saveVersion } from '../lib/versions';
import { listProjects, createProject } from '../lib/projects';
import { toast } from '../routes/store/toastStore';

const PLACEHOLDER = `Write notes the way you'd brief a teammate. For example:

Overview: this module formats prices and manages the cart.
Install with npm install @shop/cart.
Usage: call formatPrice(1999) to render a price tag.
GET /api/cart returns the current cart as JSON.
TODO: persistence is in-memory only.`;

type View = 'preview' | 'source' | 'edit';
type Variant = 'structured' | 'ai';

const NEW_PROJECT_SENTINEL = '__new__';

export function Transform() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const staged = useStagedStore((s) => s.files);
  const removeStaged = useStagedStore((s) => s.remove);

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [tab, setTab] = useState<'notes' | 'files'>('notes');
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);

  // Project selection: '' = first existing project or new, '__new__' = create new
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  const [docId, setDocId] = useState<string | null>(null);
  const [ruleBased, setRuleBased] = useState('');
  const [llm, setLlm] = useState<string | null>(null);
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [variant, setVariant] = useState<Variant>('structured');
  const [genMs, setGenMs] = useState<number | null>(null);
  const [view, setView] = useState<View>('preview');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const active = variant === 'ai' && llm ? llm : ruleBased;

  // Resolve the project ID to use when generating
  async function resolveProjectId(): Promise<string | undefined> {
    const choice = selectedProjectId || (projects && projects.length > 0 ? projects[0].projectId : NEW_PROJECT_SENTINEL);

    if (choice === NEW_PROJECT_SENTINEL) {
      const name = newProjectName.trim();
      if (!name) { toast.error('Enter a project name before generating.'); return undefined; }
      const project = await createProject({ projectName: name });
      await qc.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProjectId(project.projectId);
      setNewProjectName('');
      return project.projectId;
    }
    return choice;
  }

  async function onGenerate() {
    if (!notes.trim() && staged.length === 0) { toast.error('Add notes or stage a source file first.'); return; }
    setRunning(true);
    try {
      const projectId = await resolveProjectId();
      if (!projectId) { setRunning(false); return; }

      const sourceRepo = staged.find((f) => f.repo)?.repo;
      const bindings = staged.filter((f) => f.repo && f.sha).map((f) => ({ repoFullName: f.repo!, path: f.path, branch: f.branch ?? 'main', commitSha: f.sha! }));
      const res = await generateDoc({ notes, sourceRepo, projectId, files: staged.map((f) => ({ name: f.path || f.name, content: f.content })), bindings });
      setDocId(res.docId);
      setRuleBased(res.ruleBasedMarkdown);
      setLlm(res.llmMarkdown);
      setLlmAvailable(res.llmAvailable);
      setVariant(res.llmMarkdown ? 'ai' : 'structured');
      setGenMs(res.generationMs);
      setView('preview');
      toast.success('Documentation generated', `in ${(res.generationMs / 1000).toFixed(1)}s`);
      if (res.llmError) toast.error('AI synthesis unavailable', res.llmError);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error('Generation failed', (err as any)?.response?.data?.error?.message);
    } finally { setRunning(false); }
  }

  function selectVariant(v: Variant) { setVariant(v); setView('preview'); }

  async function onSave() {
    if (!docId) return;
    setSaving(true);
    try {
      await saveVersion(docId, draft, variant === 'ai' ? 'AI-enhanced edit' : 'Manual edit');
      if (variant === 'ai') setLlm(draft); else setRuleBased(draft);
      setView('preview');
      toast.success('Saved as a new version');
    } catch { toast.error('Could not save version'); }
    finally { setSaving(false); }
  }

  // Save the AI variant as-is without entering edit mode
  async function onSaveAI() {
    if (!docId || !llm) return;
    setSaving(true);
    try {
      await saveVersion(docId, llm, 'AI-enhanced version');
      toast.success('AI version saved');
    } catch { toast.error('Could not save AI version'); }
    finally { setSaving(false); }
  }

  const effectiveChoice = selectedProjectId || (projects && projects.length > 0 ? projects[0].projectId : NEW_PROJECT_SENTINEL);

  return (
    <div className={`transform ${running ? 'transform--running' : ''}`}>
      <section className="transform__col transform__col--input">
        <div className="transform__head">
          <span className="transform__title">Input</span>
          <div className="input-tabs">
            <button className={`input-tab ${tab === 'notes' ? 'input-tab--active' : ''}`} onClick={() => setTab('notes')}>
              <NotebookPen size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Notes
            </button>
            <button className={`input-tab ${tab === 'files' ? 'input-tab--active' : ''}`} onClick={() => setTab('files')}>
              <FileCode2 size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Files ({staged.length})
            </button>
          </div>
        </div>

        {tab === 'notes' ? (
          <>
            <textarea className="notes-area" placeholder={PLACEHOLDER} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="row row--between" style={{ marginTop: 'var(--sp-2)' }}>
              <span className="charcount">{notes.length} chars</span>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {staged.length === 0 ? (
              <EmptyState icon={FileCode2} title="No files staged" desc="Add JavaScript/TypeScript files from a repository to include their API in the document."
                action={<Button size="sm" onClick={() => navigate('/repos')}>Browse repositories</Button>} />
            ) : (
              staged.map((f) => (
                <div className="staged-file" key={f.key}>
                  <div className="staged-file__head" onClick={() => setExpanded(expanded === f.key ? null : f.key)}>
                    {expanded === f.key ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <FileCode2 size={14} className="muted" />
                    <span className="staged-file__name">{f.path || f.name}</span>
                    {f.repo && <Badge mono>{f.repo}</Badge>}
                    <span className="spacer" />
                    <button className="iconbtn" style={{ width: 24, height: 24 }} aria-label={`Remove ${f.name}`} onClick={(e) => { e.stopPropagation(); removeStaged(f.key); }}>
                      <X size={13} />
                    </button>
                  </div>
                  {expanded === f.key && <CodeBlock code={f.content} lang={langFromPath(f.path || f.name)} bar={false} showLineNumbers />}
                </div>
              ))
            )}
          </div>
        )}

        {/* Project picker */}
        <div style={{ marginTop: 'var(--sp-4)', borderTop: '1px solid var(--line)', paddingTop: 'var(--sp-3)' }}>
          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <FolderGit2 size={14} /> Save to project
          </label>
          <select
            value={effectiveChoice}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ width: '100%', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius)', border: '1px solid var(--line)', background: 'var(--surface-1)', color: 'inherit', fontSize: 'var(--text-sm)' }}
          >
            {projects && projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>{p.projectName}</option>
            ))}
            <option value={NEW_PROJECT_SENTINEL}>＋ New project…</option>
          </select>

          {effectiveChoice === NEW_PROJECT_SENTINEL && (
            <div style={{ marginTop: 'var(--sp-2)' }}>
              <Input
                label="Project name"
                placeholder="e.g. Auth Service"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: 'var(--sp-3)' }}>
          <Button variant="primary" block leftIcon={<Sparkles size={16} />} loading={running} onClick={onGenerate}>
            Generate documentation
          </Button>
        </div>
      </section>

      <PipelineConnector running={running} />

      <section className="transform__col transform__col--doc">
        <div className="transform__head">
          <span className="transform__title">Document</span>
          {ruleBased && (
            <div className="row" style={{ gap: 'var(--sp-2)' }}>
              {genMs !== null && <Badge tone="add" mono><Clock size={11} /> {(genMs / 1000).toFixed(1)}s</Badge>}
              {view === 'edit' ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => { setDraft(active); setView('preview'); }}>Cancel</Button>
                  <Button size="sm" variant="primary" leftIcon={<Save size={14} />} loading={saving} onClick={onSave}>Save version</Button>
                </>
              ) : (
                <>
                  <div className="doc-toggle">
                    <button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>Preview</button>
                    <button className={view === 'source' ? 'active' : ''} onClick={() => setView('source')}>Markdown</button>
                  </div>
                  {variant === 'ai' && llm && docId && (
                    <Button size="sm" variant="primary" leftIcon={<Save size={14} />} loading={saving} onClick={onSaveAI}>
                      Save AI version
                    </Button>
                  )}
                  {docId && <ExportMenu docId={docId} />}
                  <Button size="sm" variant="secondary" leftIcon={<Pencil size={14} />} onClick={() => { setDraft(active); setView('edit'); }}>Edit</Button>
                </>
              )}
            </div>
          )}
        </div>

        {ruleBased && (
          <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
            <div className="doc-toggle">
              <button className={variant === 'structured' ? 'active' : ''} onClick={() => selectVariant('structured')}>
                <Layers size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> Structured
              </button>
              {llm ? (
                <button className={variant === 'ai' ? 'active' : ''} onClick={() => selectVariant('ai')}>
                  <Wand2 size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> AI-enhanced
                </button>
              ) : (
                <Tooltip label={llmAvailable ? 'AI synthesis failed for this run' : 'Set GROQ_API_KEY to enable'}>
                  <button disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                    <Wand2 size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} /> AI-enhanced
                  </button>
                </Tooltip>
              )}
            </div>
            <span className="faint" style={{ fontSize: 'var(--text-xs)' }}>
              {variant === 'ai' ? 'Rewritten from the extracted facts — signatures preserved.' : 'Deterministic output from the rule engine + AST.'}
            </span>
          </div>
        )}

        <div className="doc-scroll">
          {!ruleBased ? (
            <EmptyState icon={FileText} title="Your document will appear here" desc="Add notes and source files on the left, then generate. The structured Markdown renders here, ready to edit and version." />
          ) : view === 'edit' ? (
            <MarkdownEditor value={draft} onChange={setDraft} />
          ) : view === 'source' ? (
            <CodeBlock code={active} lang="markdown" filename="document.md" />
          ) : (
            <div className="fade-up"><Markdown content={active} /></div>
          )}
        </div>
      </section>
    </div>
  );
}
