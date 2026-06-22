'use strict';

const { processNotes } = require('./ruleEngine');
const { analyzeCode } = require('./astParser');

function fmtParams(params) {
  if (!params || params.length === 0) return '';
  return params
    .map((p) => {
      const opt = p.optional ? '?' : '';
      const type = p.type ? `: ${p.type}` : '';
      return `${p.name}${opt}${type}`;
    })
    .join(', ');
}

function signature(fn) {
  const asyncKw = fn.async ? 'async ' : '';
  const star = fn.generator ? '*' : '';
  const ret = fn.returnType ? `: ${fn.returnType}` : '';
  return `${asyncKw}${fn.name}${star}(${fmtParams(fn.params)})${ret}`;
}

function buildStructure({ title, notes, code }) {
  const noteResult = processNotes(notes || '');
  const codeResult = code && code.trim() ? analyzeCode(code) : null;

  return {
    title: title || 'Untitled Documentation',
    generatedAt: new Date().toISOString(),
    noteSections: noteResult.sections,
    code: codeResult,
    meta: {
      notes: noteResult.stats,
      language: codeResult ? codeResult.language : null,
      code: codeResult ? codeResult.stats : null,
    },
  };
}

function renderMarkdown(structure) {
  const lines = [];
  const push = (s = '') => lines.push(s);

  push(`# ${structure.title}`);
  push();
  push(`> Generated at ${new Date(structure.generatedAt).toLocaleString()}`);
  push();

  // Render note sections
  for (const section of structure.noteSections) {
    push(`## ${section.title}`);
    push();
    for (const line of section.lines) {
      push(`- ${line}`);
    }
    push();
  }

  // Render code analysis
  if (structure.code) {
    const { functions, classes, language, stats } = structure.code;

    push(`## Code Analysis`);
    push();
    push(`**Language:** ${language}`);
    push(`**Functions:** ${stats.functionCount} · **Classes:** ${stats.classCount} · **Lines:** ${stats.lineCount}`);
    push();

    if (functions.length > 0) {
      push(`### Functions`);
      push();
      for (const fn of functions) {
        push(`#### \`${signature(fn)}\``);
        if (fn.description) push(`${fn.description}`);
        if (fn.params.length > 0) {
          push();
          push('**Parameters:**');
          for (const p of fn.params) {
            const type = p.type ? ` \`${p.type}\`` : '';
            const opt = p.optional ? ' *(optional)*' : '';
            push(`- \`${p.name}\`${type}${opt}`);
          }
        }
        if (fn.returnType) {
          push();
          push(`**Returns:** \`${fn.returnType}\``);
        }
        push();
      }
    }

    if (classes.length > 0) {
      push(`### Classes`);
      push();
      for (const cls of classes) {
        push(`#### \`${cls.name}\`${cls.superClass ? ` extends \`${cls.superClass}\`` : ''}`);
        if (cls.description) push(cls.description);
        push();
        if (cls.methods.length > 0) {
          push('**Methods:**');
          for (const m of cls.methods) {
            push(`- \`${m.name}(${fmtParams(m.params)})\`${m.description ? ` — ${m.description}` : ''}`);
          }
        }
        push();
      }
    }
  }

  return lines.join('\n');
}

function generateDoc({ title, notes, code }) {
  const structure = buildStructure({ title, notes, code });
  const markdown = renderMarkdown(structure);
  return { structure, markdown };
}

module.exports = { generateDoc, buildStructure, renderMarkdown };