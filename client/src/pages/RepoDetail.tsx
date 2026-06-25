import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Check, Sparkles, FileCode2, X } from 'lucide-react';
import { useTree, useFile } from '../lib/hooks/useGithub';
import { fetchFile } from '../lib/github';
import { FileTree } from '../components/repo/FileTree';
import { CodeBlock, langFromPath } from '../components/CodeBlock';
import { Button, Badge } from '../components/ui';
import { LoadingState, ErrorState, EmptyState } from '../components/states/States';
import { useStagedStore } from '../routes/store/stagedStore';
import { toast } from '../routes/store/toastStore';

export function RepoDetail() {
  const { owner = '', repo = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fullName = `${owner}/${repo}`;

  // Use the branch hint from the URL (?branch=master) if present.
  // The server always returns the actual resolved branch in the tree response,
  // so this is just an optimistic starting value to avoid an extra round-trip.
  const branchHint = searchParams.get('branch') ?? 'main';

  const [activePath, setActivePath] = useState<string | null>(null);
  const treeQuery = useTree(owner, repo, branchHint);

  // The server resolves the real branch (e.g. 'master' when 'main' was requested).
  // All file operations must use this resolved branch, not the hint.
  const resolvedBranch = treeQuery.data?.branch ?? branchHint;

  const fileQuery = useFile(owner, repo, activePath, resolvedBranch);

  const staged = useStagedStore((s) => s.files);
  const addStaged = useStagedStore((s) => s.add);
  const removeStaged = useStagedStore((s) => s.remove);
  const stagedPaths = new Set(staged.filter((f) => f.repo === fullName).map((f) => f.path));

  const keyFor = (path: string) => `${fullName}:${path}`;

  async function stageFile(path: string) {
    const key = keyFor(path);
    if (stagedPaths.has(path)) { removeStaged(key); return; }
    const { content, sha } = await fetchFile(owner, repo, path, resolvedBranch);
    addStaged({ key, name: path.split('/').pop() ?? path, path, repo: fullName, branch: resolvedBranch, sha, content });
    toast.success('Added to document', path.split('/').pop());
  }

  return (
    <div className="container">
      <div className="row" style={{ marginBottom: 'var(--sp-4)', gap: 'var(--sp-3)' }}>
        <Button variant="ghost" size="sm" iconOnly aria-label="Back to repositories" onClick={() => navigate('/repos')}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="mono" style={{ fontSize: 'var(--text-lg)' }}>{fullName}</h1>
        <Badge mono>{resolvedBranch}</Badge>
      </div>

      {staged.length > 0 && (
        <div className="card" style={{ padding: 'var(--sp-3) var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
          <div className="row row--between" style={{ flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <div className="staged-strip">
              <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>Staged ({staged.length}):</span>
              {staged.map((f) => (
                <Badge key={f.key} mono>
                  <FileCode2 size={11} /> {f.name}
                  <button className="iconbtn" style={{ width: 16, height: 16, marginLeft: 2 }} onClick={() => removeStaged(f.key)} aria-label={`Remove ${f.name}`}>
                    <X size={11} />
                  </button>
                </Badge>
              ))}
            </div>
            <Button size="sm" variant="primary" leftIcon={<Sparkles size={15} />} onClick={() => navigate('/transform')}>
              Generate documentation
            </Button>
          </div>
        </div>
      )}

      {treeQuery.isLoading ? (
        <LoadingState label="Loading file tree" />
      ) : treeQuery.isError ? (
        <ErrorState desc="Could not load this repository's files." action={<Button onClick={() => treeQuery.refetch()}>Retry</Button>} />
      ) : (
        <div className="filebrowser">
          <FileTree nodes={treeQuery.data?.tree ?? []} activePath={activePath} stagedPaths={stagedPaths} onSelect={setActivePath} />
          <div>
            {!activePath ? (
              <EmptyState icon={FileCode2} title="Select a file" desc="Choose a JavaScript or TypeScript file from the tree to preview it here." />
            ) : fileQuery.isLoading ? (
              <LoadingState label="Loading file" />
            ) : fileQuery.isError || !fileQuery.data ? (
              <ErrorState desc="Could not load that file." />
            ) : (
              <>
                <div className="preview-head">
                  <span className="mono muted" style={{ fontSize: 'var(--text-sm)' }}>{activePath}</span>
                  <Button size="sm" variant={stagedPaths.has(activePath) ? 'secondary' : 'primary'} leftIcon={stagedPaths.has(activePath) ? <Check size={15} /> : <Plus size={15} />} onClick={() => stageFile(activePath)}>
                    {stagedPaths.has(activePath) ? 'Added' : 'Add to document'}
                  </Button>
                </div>
                <CodeBlock code={fileQuery.data.content} lang={langFromPath(activePath)} filename={activePath.split('/').pop()} showLineNumbers />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
