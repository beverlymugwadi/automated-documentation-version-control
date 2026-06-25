import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileType2, FileCode, Loader2 } from 'lucide-react';
import { Button } from './ui';
import { downloadExport, type ExportFormat } from '../lib/export';
import { toast } from '../routes/store/toastStore';

const OPTIONS: { format: ExportFormat; label: string; desc: string; icon: typeof FileText }[] = [
  { format: 'pdf', label: 'PDF', desc: 'Typeset design document', icon: FileType2 },
  { format: 'docx', label: 'Word (.docx)', desc: 'Editable Word document', icon: FileText },
  { format: 'md', label: 'Markdown', desc: 'Raw .md source', icon: FileCode },
];

export function ExportMenu({ docId }: { docId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function run(format: ExportFormat) {
    setBusy(format);
    try {
      await downloadExport(docId, format);
      toast.success(`Exported as ${format.toUpperCase()}`);
      setOpen(false);
    } catch {
      toast.error('Export failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Button size="sm" leftIcon={<Download size={15} />} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        Export
      </Button>
      {open && (
        <div className="menu" role="menu" style={{ minWidth: 240 }}>
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            return (
              <button key={o.format} className="menu__item" role="menuitem" disabled={busy !== null} onClick={() => run(o.format)}>
                {busy === o.format ? <Loader2 size={15} className="spin" /> : <Icon size={15} />}
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{o.label}</span>
                  <span className="faint" style={{ fontSize: 'var(--text-xs)' }}>{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}