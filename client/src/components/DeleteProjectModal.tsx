import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal, Button, Input } from './ui';

export function DeleteProjectModal({ open, onClose, projectName, docCount, onConfirm, deleting }: {
  open: boolean; onClose: () => void; projectName: string; docCount: number; onConfirm: () => void; deleting: boolean;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === projectName;

  return (
    <Modal open={open} title="Delete project" onClose={onClose}
      footer={
        <><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" leftIcon={<Trash2 size={15} />} disabled={!matches} loading={deleting} onClick={onConfirm}>
          Delete this project
        </Button></>
      }
    >
      <p style={{ marginBottom: 'var(--sp-3)' }}>
        This permanently deletes <strong>{projectName}</strong> and everything in it:
      </p>
      <ul className="muted" style={{ margin: '0 0 var(--sp-4) var(--sp-5)', fontSize: 'var(--text-sm)', lineHeight: 1.8 }}>
        <li><strong className="confirm-strong">{docCount}</strong> document{docCount === 1 ? '' : 's'} and all of their versions</li>
        <li>All developer notes and stored source files</li>
        <li>The local Git history for each document</li>
      </ul>
      <p className="muted" style={{ marginBottom: 'var(--sp-2)', fontSize: 'var(--text-sm)' }}>
        This cannot be undone. Type <span className="mono confirm-strong">{projectName}</span> to confirm.
      </p>
      <Input label="Project name" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
    </Modal>
  );
}