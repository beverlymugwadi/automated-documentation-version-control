export interface NoteBlock {
  text: string;
  confidence: number;
  code?: boolean;
}

export interface NoteSection {
  id: string;
  title: string;
  blocks: NoteBlock[];
}

export interface NoteResult {
  sections: NoteSection[];
  stats: { blockCount: number; categorised: number };
}

interface Rule {
  id: string;
  title: string;
  order: number;
  keywords: string[];
  patterns: RegExp[];
  weight: number;
}

const RULES: Rule[] = [
  {
    id: 'overview', title: 'Overview', order: 1, weight: 1,
    keywords: ['overview', 'summary', 'purpose', 'about', 'introduction', 'intro', 'goal', 'what is', 'this module', 'this service'],
    patterns: [/\bthis (module|service|library|package|app|project)\b/i, /\bprovides?\b/i],
  },
  {
    id: 'installation', title: 'Installation', order: 2, weight: 1.2,
    keywords: ['install', 'installation', 'setup', 'set up', 'requirement', 'requirements', 'prerequisite', 'dependency', 'dependencies'],
    patterns: [/\bnpm (install|i)\b/i, /\byarn add\b/i, /\bpnpm add\b/i, /\bdocker\b/i],
  },
  {
    id: 'usage', title: 'Usage', order: 3, weight: 1,
    keywords: ['usage', 'use', 'using', 'example', 'examples', 'how to', 'call', 'invoke', 'run'],
    patterns: [/\bfor example\b/i, /\be\.g\.?\b/i, /\bto (use|run|call)\b/i],
  },
  {
    id: 'configuration', title: 'Configuration', order: 4, weight: 1.1,
    keywords: ['config', 'configure', 'configuration', 'option', 'options', 'env', 'environment', 'setting', 'settings', 'flag'],
    patterns: [/\b[A-Z][A-Z0-9_]{3,}\b/, /\.env\b/i],
  },
  {
    id: 'api', title: 'API', order: 5, weight: 1.1,
    keywords: ['api', 'endpoint', 'endpoints', 'route', 'routes', 'parameter', 'parameters', 'param', 'returns', 'response', 'request', 'method', 'function', 'payload'],
    patterns: [/\b(GET|POST|PUT|PATCH|DELETE)\b/, /\/[a-z0-9/_:-]+/i, /\breturns?\b/i, /\baccepts?\b/i, /\(\s*\)/],
  },
  {
    id: 'caveats', title: 'Notes & Caveats', order: 6, weight: 1.2,
    keywords: ['note', 'caveat', 'warning', 'warn', 'gotcha', 'limitation', 'deprecated', 'known issue', 'careful', 'cannot', "doesn't", 'not supported'],
    patterns: [/\bnote:?\b/i, /\bwarning:?\b/i, /\bdeprecated\b/i, /\bdoes not\b/i, /\bonly supports?\b/i],
  },
  {
    id: 'todo', title: 'TODO', order: 7, weight: 1.4,
    keywords: ['todo', 'fixme', 'tbd', 'later', 'wip'],
    patterns: [/\bTODO\b/, /\bFIXME\b/, /\bTBD\b/],
  },
];

const FALLBACK = { id: 'overview', title: 'Overview', order: 1 };
const WORD_RE = /[a-zA-Z][a-zA-Z0-9'-]*/g;

function segment(notes: string): NoteBlock[] {
  const lines = notes.replace(/\r\n/g, '\n').split('\n');
  const blocks: NoteBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    if (/^```/.test(lines[i].trim())) {
      const buf: string[] = [lines[i]];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) buf.push(lines[i++]);
      if (i < lines.length) buf.push(lines[i++]);
      blocks.push({ text: buf.join('\n'), confidence: 0, code: true });
      continue;
    }
    const line = lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, '').trim();
    if (line) blocks.push({ text: line, confidence: 0 });
    i += 1;
  }
  return blocks;
}

function classify(text: string): { id: string; title: string; order: number; confidence: number } {
  const lower = text.toLowerCase();
  const words = new Set(lower.match(WORD_RE) ?? []);
  let best: Rule | null = null;
  let bestScore = 0;

  for (const rule of RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (kw.includes(' ') ? lower.includes(kw) : words.has(kw)) score += rule.weight;
    }
    for (const p of rule.patterns) if (p.test(text)) score += rule.weight * 1.5;
    if (score > bestScore) { bestScore = score; best = rule; }
  }

  const target = best ?? FALLBACK;
  return { id: target.id, title: target.title, order: target.order, confidence: Math.min(bestScore / 3, 1) };
}

export function processNotes(notes: string): NoteResult {
  const blocks = segment(notes ?? '');
  const byId = new Map<string, NoteSection & { order: number }>();
  let categorised = 0;

  for (const block of blocks) {
    const cls = block.code ? { id: 'usage', title: 'Usage', order: 3, confidence: 0.6 } : classify(block.text);
    if (cls.confidence > 0) categorised += 1;
    if (!byId.has(cls.id)) byId.set(cls.id, { id: cls.id, title: cls.title, order: cls.order, blocks: [] });
    byId.get(cls.id)!.blocks.push({ ...block, confidence: cls.confidence });
  }

  const sections = [...byId.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ id, title, blocks: b }) => ({ id, title, blocks: b }));

  return { sections, stats: { blockCount: blocks.length, categorised } };
}