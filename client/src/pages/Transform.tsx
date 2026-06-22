import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, NotebookPen, FileCode2, ChevronDown, ChevronRight, X, FileText, Pencil, Save, Clock, Wand2, Layers } from 'lucide-react';
import { Button, Badge, Tooltip } from '../components/ui';
import { Markdown } from '../components/Markdown';
import { CodeBlock, langFromPath } from '../components/CodeBlock';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { PipelineConnector } from '../components/PipelineConnector';
import { EmptyState } from '../components/states/States';
import { useStagedStore } from '../store/stagedStore';
import { generateDoc } from '../lib/generate';
import { saveVersion } from '../lib/versions';
import { toast } from '../store/toastStore';

const PLACEHOLDER = `Write notes the way you'd brief a teammate. For example:

Overview: this module formats prices and manages the cart.
Install with npm install @shop/cart.
Usage: call formatPrice(1999) to render a price tag.
GET /api/cart returns the current cart as JSON.
TODO: persistence is in-memory only.`;

type View = 'preview' | 'source' | 'edit';
type Variant = 'structured' | 'ai';

export function Transform() {
  const navigate = useNavigate();
  const staged = useStagedStore((s) => s.files);
  const removeStaged = useStagedStore((s) => s.remove);

  const [tab, setTab] = useState<'notes' | 'files'>('notes');
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);

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

  async function onGenerate() {
    if (!notes.trim() && staged.length === 0) { toast.error('Add notes or stage a source file first.'); return; }
    setRunning(true);
    try {
      const sourceRepo = staged.find((f) => f.repo)?.repo;
      const bindings = staged.filter((f) => f.repo && f.sha).map((f) => ({ repoFullName: f.repo!, path: f.path, branch: f.branch ?? 'main', commitSha: f.sha! }));
      const res = await generateDoc({ notes, sourceRepo, files: staged.map((f) => ({ name: f.path || f.name, content: f.content })), bindings });
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

        <div style={{ marginTop: 'var(--sp-4)' }}>
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
                <Tooltip label={llmAvailable ? 'AI synthesis failed for this run' : 'Set OPENAI_API_KEY to enable'}>
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