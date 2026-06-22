'use strict';

function exportMarkdown(doc, res) {
  const filename = `${doc.title.replace(/\s+/g, '-').toLowerCase()}.md`;
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(doc.content);
}

module.exports = { exportMarkdown };