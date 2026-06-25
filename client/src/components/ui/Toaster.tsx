import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, type ToastTone } from '../../routes/store/toastStore';

const ICON: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="ui-toasts" role="region" aria-label="Notifications">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div key={t.id} className={`ui-toast ui-toast--${t.tone}`} role="status">
            <span className="ui-toast__icon"><Icon size={17} /></span>
            <div style={{ flex: 1 }}>
              <div className="ui-toast__title">{t.title}</div>
              {t.message && <div className="ui-toast__msg">{t.message}</div>}
            </div>
            <button className="iconbtn" style={{ width: 24, height: 24 }} onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}