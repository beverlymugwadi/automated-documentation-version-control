import { Github, ExternalLink } from 'lucide-react';
import { Modal, Button } from './ui';
import { githubAuthUrl } from '../lib/auth';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GitHubConnectModal({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      title="Connect GitHub"
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ExternalLink size={14} />}
            onClick={() => window.open('https://github.com/login', '_blank', 'noopener')}
          >
            Switch GitHub account
          </Button>
          <Button
            variant="github"
            leftIcon={<Github size={15} />}
            onClick={() => { window.location.href = githubAuthUrl(); }}
          >
            Connect my account
          </Button>
        </>
      }
    >
      <p style={{ marginBottom: 'var(--sp-3)' }}>
        GitHub will connect whichever account is currently signed in at{' '}
        <span className="mono">github.com</span>.
      </p>
      <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
        If the wrong account is signed in, click <strong>Switch GitHub account</strong> to
        log into the correct one first, then come back and click{' '}
        <strong>Connect my account</strong>.
      </p>
    </Modal>
  );
}
