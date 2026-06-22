import { useState } from 'react';
import { UserPlus, X, Crown } from 'lucide-react';
import { Button, Input, Badge } from './ui';
import { addMember, removeMember, type Member, type Role } from '../lib/projects';
import { toast } from '../store/toastStore';

export function MembersPanel({ projectId, members, role, onChange }: {
  projectId: string; members: Member[]; role: Role | null; onChange: (members: Member[]) => void;
}) {
  const isOwner = role === 'owner';
  const [identifier, setIdentifier] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  async function add() {
    if (!identifier.trim()) return;
    setAdding(true);
    try {
      const next = await addMember(projectId, identifier.trim());
      onChange(next); setIdentifier(''); setShowAdd(false);
      toast.success('Collaborator added');
    } catch (err) {
      toast.error('Could not add', (err as any)?.response?.data?.error?.message);
    } finally { setAdding(false); }
  }

  async function remove(userId: string) {
    try {
      const next = await removeMember(projectId, userId);
      onChange(next); toast.success('Collaborator removed');
    } catch { toast.error('Could not remove collaborator'); }
  }

  const minimal = members.length <= 1 && !showAdd;

  return (
    <div>
      <div className="row row--between" style={{ marginBottom: 'var(--sp-3)' }}>
        <strong style={{ fontSize: 'var(--text-md)' }}>{minimal ? 'Collaborators' : `Members · ${members.length}`}</strong>
        {isOwner && !showAdd && (
          <Button size="sm" variant="ghost" leftIcon={<UserPlus size={14} />} onClick={() => setShowAdd(true)}>Add collaborator</Button>
        )}
      </div>
      {showAdd && (
        <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Input label="GitHub login or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} hint="Must be an existing ADGVC user" />
          </div>
          <Button variant="primary" size="sm" loading={adding} onClick={add} style={{ marginTop: 6 }}>Add</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} style={{ marginTop: 6 }}>Cancel</Button>
        </div>
      )}
      {!minimal && members.map((m) => (
        <div className="member-row" key={m.userId}>
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt="" className="member-row__avatar" />
          ) : (
            <span className="member-row__avatar" style={{ display: 'grid', placeItems: 'center', fontSize: 11 }}>
              {(m.login || '?').slice(0, 2).toUpperCase()}
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 'var(--text-sm)' }}>@{m.login || 'unknown'}</div>
          </div>
          {m.role === 'owner' ? <Badge tone="signal"><Crown size={11} /> owner</Badge> : <Badge>editor</Badge>}
          {isOwner && m.role !== 'owner' && (
            <button className="iconbtn" style={{ width: 26, height: 26 }} aria-label={`Remove @${m.login}`} onClick={() => remove(m.userId)}>
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}