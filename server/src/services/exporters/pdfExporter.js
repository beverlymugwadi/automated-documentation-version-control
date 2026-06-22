'use strict';

const PDFDocument = require('pdfkit');

function exportPdf(doc, res) {
  const filename = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const pdf = new PDFDocument({ margin: 50 });
  pdf.pipe(res);

  // Title
  pdf.fontSize(24).font('Helvetica-Bold').text(doc.title, { align: 'center' });
  pdf.moveDown();

  // Process each line of markdown
  const lines = doc.content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      pdf.fontSize(20).font('Helvetica-Bold').text(line.slice(2));
      pdf.moveDown(0.5);
    } else if (line.startsWith('## ')) {
      pdf.fontSize(16).font('Helvetica-Bold').text(line.slice(3));
      pdf.moveDown(0.5);
    } else if (line.startsWith('### ')) {
      pdf.fontSize(13).font('Helvetica-Bold').text(line.slice(4));
      pdf.moveDown(0.3);
    } else if (line.startsWith('- ')) {
      pdf.fontSize(11).font('Helvetica').text(`• ${line.slice(2)}`, { indent: 20 });
    } else if (line.startsWith('> ')) {
      pdf.fontSize(10).font('Helvetica-Oblique')
        .fillColor('#666666')
        .text(line.slice(2), { indent: 20 });
      pdf.fillColor('#000000');
    } else if (line.trim() === '') {
      pdf.moveDown(0.5);
    } else {
      pdf.fontSize(11).font('Helvetica').text(line);
    }
  }

  pdf.end();
}

module.exports = { exportPdf };