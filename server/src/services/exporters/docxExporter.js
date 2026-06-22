'use strict';

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} = require('docx');

async function exportDocx(doc, res) {
  const filename = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.docx`;
  const lines = doc.content.split('\n');
  const children = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        text: line.slice(2),
        heading: HeadingLevel.HEADING_1,
      }));
    } else if (line.startsWith('## ')) {
      children.push(new Paragraph({
        text: line.slice(3),
        heading: HeadingLevel.HEADING_2,
      }));
    } else if (line.startsWith('### ')) {
      children.push(new Paragraph({
        text: line.slice(4),
        heading: HeadingLevel.HEADING_3,
      }));
    } else if (line.startsWith('- ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${line.slice(2)}` })],
      }));
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: line })],
      }));
    }
  }

  const document = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(document);

  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

module.exports = { exportDocx };