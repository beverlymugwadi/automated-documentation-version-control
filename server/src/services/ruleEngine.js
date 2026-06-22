'use strict';

const CATEGORY_RULES = [
  {
    id: 'overview',
    title: 'Overview',
    order: 1,
    keywords: ['overview', 'summary', 'purpose', 'about', 'goal', 'intro', 'introduction', 'context'],
    patterns: [/\bthis (module|project|service|app)\b/i, /\bdescribes?\b/i],
    weight: 1,
  },
  {
    id: 'installation',
    title: 'Installation & Setup',
    order: 2,
    keywords: ['install', 'setup', 'configure', 'configuration', 'env', 'environment', 'dependency', 'dependencies', 'requirement', 'prerequisites'],
    patterns: [/\bnpm (install|i)\b/i, /\byarn add\b/i, /\.env\b/i, /\bdocker\b/i],
    weight: 1.2,
  },
  {
    id: 'usage',
    title: 'Usage',
    order: 3,
    keywords: ['usage', 'use', 'using', 'example', 'examples', 'call', 'invoke', 'run', 'command', 'how to'],
    patterns: [/\bfor example\b/i, /\be\.g\.?\b/i, /\bto (use|run|call)\b/i],
    weight: 1,
  },
  {
    id: 'api',
    title: 'API Reference',
    order: 4,
    keywords: ['api', 'endpoint', 'endpoints', 'route', 'routes', 'parameter', 'parameters', 'returns', 'response', 'request', 'payload', 'method'],
    patterns: [/\b(GET|POST|PUT|PATCH|DELETE)\b/, /\/[a-z0-9/_:-]+\b/i, /\breturns?\b/i],
    weight: 1.1,
  },
  {
    id: 'behaviour',
    title: 'Behaviour & Logic',
    order: 5,
    keywords: ['behaviour', 'behavior', 'logic', 'handle', 'handles', 'validate', 'validation', 'process', 'flow', 'rule', 'rules', 'when', 'if', 'otherwise', 'fallback'],
    patterns: [/\bwhen\b.*\bthen\b/i, /\bif\b.*\b(then|else)\b/i, /\bshould\b/i],
    weight: 0.9,
  },
  {
    id: 'errors',
    title: 'Error Handling',
    order: 6,
    keywords: ['error', 'errors', 'exception', 'exceptions', 'fail', 'failure', 'throw', 'catch', 'invalid', 'missing'],
    patterns: [/\b(throws?|catch(es)?)\b/i, /\berror\s+code\b/i],
    weight: 1,
  },
  {
    id: 'changelog',
    title: 'Changelog',
    order: 7,
    keywords: ['changelog', 'change', 'changes', 'update', 'updated', 'version', 'release', 'added', 'fixed', 'removed'],
    patterns: [/\bv\d+\.\d+/i, /\b(added|fixed|removed|changed)\b/i],
    weight: 1,
  },
];

function scoreLine(line, rule) {
  let score = 0;
  const lower = line.toLowerCase();
  for (const kw of rule.keywords) {
    if (lower.includes(kw)) score += rule.weight;
  }
  for (const pattern of rule.patterns) {
    if (pattern.test(line)) score += rule.weight * 1.5;
  }
  return score;
}

function categorizeLine(line) {
  let bestRule = null;
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    const score = scoreLine(line, rule);
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }
  return bestRule || { id: 'general', title: 'General Notes', order: 99 };
}

function processNotes(notes) {
  const lines = notes
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const sectionMap = {};

  for (const line of lines) {
    const rule = categorizeLine(line);
    if (!sectionMap[rule.id]) {
      sectionMap[rule.id] = { title: rule.title, order: rule.order, lines: [] };
    }
    sectionMap[rule.id].lines.push(line);
  }

  const sections = Object.values(sectionMap).sort((a, b) => a.order - b.order);

  return {
    sections,
    stats: {
      totalLines: lines.length,
      sectionCount: sections.length,
    },
  };
}

module.exports = { processNotes };