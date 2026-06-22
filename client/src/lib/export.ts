import { getToken } from './api';

export type ExportFormat = 'md' | 'pdf' | 'docx';

export async function downloadExport(docId: string, format: ExportFormat): Promise<void> {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  const res = await fetch(`${base}/docs/${docId}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="(.+?)"/);
  const filename = match ? match[1] : `document.${format}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}