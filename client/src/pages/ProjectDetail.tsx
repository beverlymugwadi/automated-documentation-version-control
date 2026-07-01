import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2, GitBranch, ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { Button, Card, Badge, Input } from '../components/ui';
import { LoadingState, ErrorState, EmptyState } from '../components/states/States';
import { MembersPanel } from '../components/MembersPanel';
import { DeleteProjectModal } from '../components/DeleteProjectModal';
import { getProject, deleteProject, updateProject, type Member } from '../lib/projects';
import { relativeTime } from '../lib/time';
import { toast } from '../routes/store/toastStore';

export function ProjectDetail() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId) });
  const [members, setMembers] = useState<Member[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  if (isLoading) return <div className="container"><LoadingState label="Loading project" /></div>;
  if (isError || !data) return <div className="container"><ErrorState desc="Could not load this project." action={<Button onClick={() => refetch()}>Retry</Button>} /></div>;

  const { project, documents } = data;
  const memberList = members ?? project.members;
  const isOwner = project.role === 'owner';

  function startEdit() {
    setEditName(project.projectName);
    setEditDesc(project.description ?? '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateProject(projectId, { projectName: editName.trim(), description: editDesc.trim() });
      await qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Project updated');
      setEditing(false);
    } catch { toast.error('Could not update project'); }
    finally { setSaving(false); }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      const summary = await deleteProject(projectId);
      toast.success('Project deleted', `${summary.documents} doc(s), ${summary.versions} version(s) removed`);
      await qc.invalidateQueries({ queryKey: ['docs'] });
      navigate('/dashboard');
    } catch { toast.error('Could not delete project'); setDeleting(false); }
  }

  return (
    <div className="container">
      <button className="ui-btn ui-btn--ghost ui-btn--sm" style={{ marginBottom: 'var(--sp-4)' }} onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={15} /> Dashboard
      </button>

      <div className="row row--between" style={{ alignItems: 'flex-start', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', maxWidth: 480 }}>
              <Input label="Project name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Input label="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              <div className="row" style={{ gap: 'var(--sp-2)' }}>
                <Button variant="primary" size="sm" loading={saving} leftIcon={<Check size={14} />} onClick={saveEdit}>Save</Button>
                <Button variant="ghost" size="sm" leftIcon={<X size={14} />} onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'center' }}>
                <h1 style={{ fontSize: 'var(--text-2xl)' }}>{project.projectName}</h1>
                {project.role && <Badge tone={isOwner ? 'signal' : 'neutral'}>{project.role}</Badge>}
                {isOwner && (
                  <button className="iconbtn" aria-label="Edit project details" onClick={startEdit} style={{ width: 28, height: 28 }}>
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              {project.description && <p className="muted" style={{ marginTop: 'var(--sp-2)' }}>{project.description}</p>}
              {project.repoFullName && <p className="mono muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}><GitBranch size={12} style={{ verticalAlign: '-2px' }} /> {project.repoFullName}</p>}
            </>
          )}
        </div>
        {isOwner && !editing && <Button variant="danger" leftIcon={<Trash2 size={15} />} onClick={() => setConfirmDelete(true)}>Delete project</Button>}
      </div>

      <div className="workspace">
        <div className="workspace__main">
          <strong style={{ fontSize: 'var(--text-md)' }}>Documents · {documents.length}</strong>
          <div style={{ marginTop: 'var(--sp-3)' }}>
            {documents.length === 0 ? (
              <EmptyState icon={FileText} title="No documents yet" desc="Generate documentation to populate this project." action={<Button variant="primary" onClick={() => navigate('/transform')}>New document</Button>} />
            ) : (
              <div className="doc-grid">
                {documents.map((d) => (
                  <Card key={d.docId} hover className="doc-card" onClick={() => navigate(`/docs/${d.docId}`)}>
                    <div className="row" style={{ gap: 'var(--sp-2)' }}>
                      <FileText size={16} style={{ color: 'var(--signal)' }} />
                      <span className="doc-card__title" style={{ flex: 1 }}>{d.title}</span>
                    </div>
                    <div className="doc-card__meta">
                      <Badge mono>v{d.currentVersion}</Badge>
                      <span>Updated {relativeTime(d.updatedAt)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
        <aside className="workspace__rail">
          <MembersPanel projectId={projectId} members={memberList} role={project.role} onChange={setMembers} />
        </aside>
      </div>

      <DeleteProjectModal open={confirmDelete} onClose={() => setConfirmDelete(false)} projectName={project.projectName} docCount={documents.length} onConfirm={onDelete} deleting={deleting} />
    </div>
  );
}