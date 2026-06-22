import PDFDocument from 'pdfkit';
import { tokenizeMarkdown, stripInline } from './mdTokens';

const INK = '#0B0E14';
const SIGNAL = '#5B8DEF';
const MUTED = '#5A6373';
const LINE = '#D7DCE5';
const CODE_BG = '#F2F4F8';

const HEADING_SIZE: Record<number, number> = { 1: 22, 2: 16, 3: 13, 4: 11, 5: 11, 6: 11 };

export interface PdfMeta {
  title: string;
  version: number;
  commit: string | null;
  date: string;
}

export function exportPdf(markdown: string, meta: PdfMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 64, bottom: 72, left: 64, right: 64 },
      info: { Title: meta.title, Author: 'ADGVC' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Title page
    doc.moveDown(6);
    doc.fillColor(SIGNAL).fontSize(11).font('Helvetica-Bold').text('ADGVC · DOCUMENTATION', { characterSpacing: 1 });
    doc.moveDown(0.5);
    doc.fillColor(INK).fontSize(30).font('Helvetica-Bold').text(meta.title);
    doc.moveTo(doc.page.margins.left, doc.y + 8).lineTo(doc.page.margins.left + 56, doc.y + 8).lineWidth(3).strokeColor(SIGNAL).stroke();
    doc.moveDown(2);
    doc.fillColor(MUTED).fontSize(11).font('Helvetica');
    doc.text(`Version v${meta.version}`);
    doc.text(`Commit ${meta.commit ? meta.commit.slice(0, 7) : '—'}`, { continued: false });
    doc.text(meta.date);
    doc.addPage();

    // Body
    const tokens = tokenizeMarkdown(markdown);
    for (const tok of tokens) {
      switch (tok.type) {
        case 'heading': {
          doc.moveDown(tok.level <= 2 ? 0.7 : 0.4);
          doc.fillColor(INK).font('Helvetica-Bold').fontSize(HEADING_SIZE[tok.level] ?? 11).text(stripInline(tok.text));
          if (tok.level <= 2) {
            doc.moveTo(doc.page.margins.left, doc.y + 3).lineTo(doc.page.width - doc.page.margins.right, doc.y + 3).lineWidth(0.5).strokeColor(LINE).stroke();
          }
          doc.moveDown(0.3);
          break;
        }
        case 'paragraph':
          doc.fillColor(INK).font('Helvetica').fontSize(10.5).text(stripInline(tok.text), { lineGap: 3 });
          doc.moveDown(0.4);
          break;
        case 'quote':
          doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(10).text(stripInline(tok.text), { lineGap: 2 });
          doc.moveDown(0.4);
          break;
        case 'list':
          doc.fillColor(INK).font('Helvetica').fontSize(10.5);
          for (const item of tok.items) doc.text(`•  ${stripInline(item)}`, { indent: 12, lineGap: 2 });
          doc.moveDown(0.4);
          break;
        case 'code': {
          doc.moveDown(0.2);
          const y0 = doc.y;
          doc.font('Courier').fontSize(9);
          const h = doc.heightOfString(tok.text || ' ', { width: contentWidth - 24 });
          if (y0 + h + 16 > doc.page.height - doc.page.margins.bottom) doc.addPage();
          const top = doc.y;
          doc.rect(doc.page.margins.left, top, contentWidth, h + 16).fill(CODE_BG);
          doc.fillColor(INK).font('Courier').fontSize(9).text(tok.text || ' ', doc.page.margins.left + 12, top + 8, { width: contentWidth - 24 });
          doc.moveDown(0.7);
          break;
        }
        case 'table': {
          const [head, ...body] = tok.rows;
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(head.map(stripInline).join('    '));
          doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2).lineWidth(0.5).strokeColor(LINE).stroke();
          doc.moveDown(0.3).font('Helvetica').fontSize(9.5);
          for (const row of body) doc.fillColor(INK).text(row.map(stripInline).join('    '));
          doc.moveDown(0.5);
          break;
        }
        case 'hr':
          doc.moveDown(0.3).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).lineWidth(0.5).strokeColor(LINE).stroke();
          doc.moveDown(0.5);
          break;
      }
    }

    // Page numbers + footer
    const range = doc.bufferedPageRange();
    for (let p = range.start; p < range.start + range.count; p++) {
      doc.switchToPage(p);
      doc.fillColor(MUTED).font('Helvetica').fontSize(8);
      doc.text(`${meta.title} · v${meta.version}`, doc.page.margins.left, doc.page.height - 48, { width: contentWidth / 2 });
      doc.text(`Page ${p - range.start + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 48, { width: contentWidth, align: 'right' });
    }

    doc.end();
  });
}