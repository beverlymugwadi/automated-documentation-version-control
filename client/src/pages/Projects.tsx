import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderGit2, FileText, Users, Trash2, GitBranch, Plus } from 'lucide-react';
import { Button, Card, Badge, Modal, Input } from '../components/ui';
import { EmptyState, ErrorState, Skeletons } from '../components/states/States';
import { DeleteProjectModal } from '../components/DeleteProjectModal';
import { listProjects, createProject, deleteProject, type ProjectSummary } from '../lib/projects';
import { relativeTime } from '../lib/time';
import { toast } from '../store/toastStore';

export function Projects() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const [target, setTarget] = useState<ProjectSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  async function onDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      const summary = await deleteProject(target.projectId);
      toast.success('Project deleted', `${summary.documents} doc(s), ${summary.versions} version(s) removed`);
      setTarget(null);
      await qc.invalidateQueries({ queryKey: ['projects'] });
      await qc.invalidateQueries({ queryKey: ['docs'] });
    } catch { toast.error('Could not delete project'); }
    finally { setDeleting(false); }
  }

  async function onCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const project = await createProject({ projectName: newName.trim(), description: newDesc.trim() });
      toast.success('Project created');
      setCreateOpen(false);
      setNewName('');
      setNewDesc('');
      await qc.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/projects/${project.projectId}`);
    } catch { toast.error('Could not create project'); }
    finally { setCreating(false); }
  }

  return (
    <div className="container">
      <div className="row row--between" style={{ marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)' }}>Projects</h1>
          <p className="muted" style={{ marginTop: 'var(--sp-2)' }}>Workspaces grouping your documents, members and source.</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setNewName(''); setNewDesc(''); setCreateOpen(true); }}>
          New project
        </Button>
      </div>

      {isLoading ? (
        <div className="doc-grid"><Skeletons count={4} height={132} /></div>
      ) : isError ? (
        <ErrorState desc="Could not load your projects." action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : !data || data.length === 0 ? (
        <Card style={{ padding: 'var(--sp-7)' }}>
          <EmptyState icon={FolderGit2} title="No projects yet" desc="Create a project to organise your documents, or generate a document and one will be created for you."
            action={<Button variant="primary" leftIcon={<Plus size={15} />} onClick={() => { setNewName(''); setNewDesc(''); setCreateOpen(true); }}>New project</Button>} />
        </Card>
      ) : (
        <div className="doc-grid fade-up">
          {data.map((p) => (
            <Card key={p.projectId} className="doc-card" style={{ cursor: 'default' }}>
              <div className="row row--between">
                <button className="row" style={{ gap: 'var(--sp-2)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', minWidth: 0 }} onClick={() => navigate(`/projects/${p.projectId}`)}>
                  <FolderGit2 size={16} style={{ color: 'var(--signal)' }} />
                  <span className="doc-card__title truncate">{p.projectName}</span>
                </button>
                {p.role === 'owner' && (
                  <button className="iconbtn" style={{ width: 28, height: 28 }} aria-label={`Delete ${p.projectName}`} onClick={() => setTarget(p)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <p className="muted" style={{ fontSize: 'var(--text-sm)', flex: 1 }}>{p.description || 'No description.'}</p>
              <div className="doc-card__meta">
                <span className="row" style={{ gap: 4 }}><FileText size={12} /> {p.docCount}</span>
                <span className="row" style={{ gap: 4 }}><Users size={12} /> {p.memberCount}</span>
                {p.repoFullName && <span className="row" style={{ gap: 4 }}><GitBranch size={12} /> {p.repoFullName}</span>}
                {p.role && <Badge tone={p.role === 'owner' ? 'signal' : 'neutral'}>{p.role}</Badge>}
                <span>· {relativeTime(p.updatedAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        title="New project"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={creating} disabled={!newName.trim()} onClick={onCreate}>
              Create project
            </Button>
          </>
        }
      >
        <div className="stack-4">
          <Input
            label="Project name"
            placeholder="e.g. Auth Service"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void onCreate(); }}
            autoFocus
          />
          <Input
            label="Description (optional)"
            placeholder="What is this project about?"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
        </div>
      </Modal>

      <DeleteProjectModal open={target !== null} onClose={() => setTarget(null)} projectName={target?.projectName ?? ''} docCount={target?.docCount ?? 0} onConfirm={onDelete} deleting={deleting} />
    </div>
  );
}
