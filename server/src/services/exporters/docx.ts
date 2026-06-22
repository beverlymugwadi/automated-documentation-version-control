import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx';
import { tokenizeMarkdown, stripInline } from './mdTokens';
import type { PdfMeta } from './pdf';

const HEADING: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

function codeLines(text: string): Paragraph[] {
  return text.split('\n').map((l) => new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 18 })],
  }));
}

function tableOf(rows: string[][]): Table {
  const [head, ...body] = rows;
  const row = (cells: string[], bold: boolean) =>
    new TableRow({
      children: cells.map((c) => new TableCell({
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: stripInline(c), bold })] })],
      })),
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [row(head, true), ...body.map((r) => row(r, false))],
  });
}

export async function exportDocx(markdown: string, meta: PdfMeta): Promise<Buffer> {
  const tokens = tokenizeMarkdown(markdown);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: meta.title })] }),
    new Paragraph({
      children: [new TextRun({ text: `Version v${meta.version} · Commit ${meta.commit ? meta.commit.slice(0, 7) : '—'} · ${meta.date}`, color: '5A6373', size: 18 })],
      spacing: { after: 240 },
    }),
  ];

  for (const tok of tokens) {
    switch (tok.type) {
      case 'heading':
        children.push(new Paragraph({
          heading: HEADING[tok.level] ?? HeadingLevel.HEADING_6,
          spacing: { before: 200, after: 80 },
          children: [new TextRun({ text: stripInline(tok.text) })],
        }));
        break;
      case 'paragraph':
        children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: stripInline(tok.text) })] }));
        break;
      case 'quote':
        children.push(new Paragraph({
          spacing: { after: 120 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: '5B8DEF', space: 12 } },
          children: [new TextRun({ text: stripInline(tok.text), italics: true, color: '5A6373' })],
        }));
        break;
      case 'list':
        for (const item of tok.items) {
          children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: stripInline(item) })] }));
        }
        break;
      case 'code':
        children.push(...codeLines(tok.text));
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case 'table':
        children.push(tableOf(tok.rows));
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        break;
      case 'hr':
        children.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D7DCE5', space: 8 } },
          children: [],
        }));
        break;
    }
  }

  const document = new Document({ creator: 'ADGVC', title: meta.title, sections: [{ properties: {}, children }] });
  return Packer.toBuffer(document);
}