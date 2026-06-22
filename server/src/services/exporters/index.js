'use strict';

const { exportMarkdown } = require('./markdownExporter');
const { exportPdf } = require('./pdfExporter');
const { exportDocx } = require('./docxExporter');

async function exportDoc(format, doc, res) {
  switch (format) {
    case 'pdf':
      return exportPdf(doc, res);
    case 'docx':
      return exportDocx(doc, res);
    case 'markdown':
    default:
      return exportMarkdown(doc, res);
  }
}

module.exports = { exportDoc };