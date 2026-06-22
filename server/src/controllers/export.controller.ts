import type { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { dataStore } from '../lib/dataStore';
import { exportPdf, type PdfMeta } from '../services/exporters/pdf';
import { exportDocx } from '../services/exporters/docx';
import { HttpError } from '../middleware/errorHandler';

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
}

export const exportDoc = asyncHandler(async (req: Request, res: Response) => {
  const doc = await dataStore.getDoc(req.params.docId);
  if (!doc) throw new HttpError(404, 'Documentation not found.');
  if (doc.userId && doc.userId !== req.user!.userId) throw new HttpError(403, 'You do not have access to this document.');

  const format = String(req.query.format ?? 'md').toLowerCase();
  const versions = await dataStore.listVersions(doc.docId);
  const meta: PdfMeta = {
    title: doc.title,
    version: doc.currentVersion,
    commit: versions[0]?.commitHash ?? null,
    date: new Date(doc.updatedAt).toUTCString(),
  };
  const filename = slug(doc.title);

  if (format === 'md' || format === 'markdown') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.md"`);
    res.send(doc.content);
    return;
  }
  if (format === 'pdf') {
    const buf = await exportPdf(doc.content, meta);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    res.send(buf);
    return;
  }
  if (format === 'docx') {
    const buf = await exportDocx(doc.content, meta);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
    res.send(buf);
    return;
  }

  throw new HttpError(400, `Unsupported format "${format}". Use md, pdf or docx.`);
});