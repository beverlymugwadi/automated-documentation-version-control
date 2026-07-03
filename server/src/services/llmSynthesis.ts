import { env } from '../config/env';
import type { ComposeResult } from './docComposer';

type Structure = ComposeResult['structure'];

export interface SynthesisResult {
  llmMarkdown: string | null;
  llmAvailable: boolean;
  llmError?: string;
  derivedTitle?: string;
  /** Number of units sent to the LLM. */
  unitCount?: number;
  /** Number of ### headings found in the output — should equal unitCount. */
  documentedCount?: number;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TIMEOUT_MS = 90_000;
/** Per-unit source cap: large enough for a full controller action (~200 lines). */
const SOURCE_CAP = 14_000;
const HEAD_SOURCE_CAP = 6_000;
/** Output token budget per call. Enough for ~3 000 words of Markdown. */
const MAX_TOKENS_HEAD = 1_500;
const MAX_TOKENS_UNITS = 4_096;

// ─── PASS 1: Document-level HEAD ────────────────────────────────────────────
const HEAD_SYSTEM_PROMPT = `You are a senior technical writer producing the DOCUMENT-LEVEL HEAD of a software module's reference documentation.

You receive a complete summary of all exported declarations, the file's imports, detected env vars, file-level comments, and the developer's notes.

Produce ONLY the following Markdown sections in order:

# <Derived Title>
Derive the title from what the code ACTUALLY DOES. HINT_TITLE is an external label that may be wrong — prefer what the code itself reveals.

## Overview
2-4 sentences. State WHAT this module is, its PRIMARY PURPOSE, and any KEY DESIGN FACT (e.g. MongoDB + JSON fallback, stateless JWT, Socket.io notifications). Do not list every function — synthesize the pattern. Mention security-relevant behaviour briefly if present (auth checks, password hashing, token signing).

## How It Fits Together
3-6 sentences showing how the key functions RELATE and in what ORDER they are typically called. Show the call-chain where one exists. If the module is a bag of independent utilities, say so in one sentence.

## Configuration
ONLY emit this section when the module reads process.env variables or has a feature-toggle.
Format: | Variable | Purpose | — infer purpose from usage and names.
ABSOLUTE RULE: if there are ZERO env vars, OMIT this section entirely — do not render headers with no rows.

RULES:
• Output only the sections above. No per-function documentation, no preamble, no closing.
• HINT_TITLE is a hint, not a mandate. Prefer what the code does.
• ABSOLUTE RULE: Never render a table heading with zero data rows. If a section would be empty, omit it.
• Ground every claim in the provided data. Do not invent.`;

// ─── PASS 2: Per-unit reference sections ────────────────────────────────────
const UNIT_SYSTEM_PROMPT = `You are a senior technical writer producing PER-FUNCTION REFERENCE sections.
The document already has a title, overview, and configuration — do NOT reproduce them.
Begin directly with the first ### heading.

For each unit you receive: FACT_SHEET (AST facts — authoritative for names/types), COMMENTS (authoritative for intent), ROLE, SOURCE (authoritative for runtime behaviour).

For EVERY unit emit these sections (omit only when genuinely inapplicable):

  ### \`<name>\`  [for Express handlers: ### \`<name>\` — METHOD /path  ·  <access>]
  **Purpose** — one sentence. Ground in COMMENTS first, then SOURCE.

  **Request** (Express handlers only) — show the REAL API surface, not (req, res, next):
    - If FACT_SHEET includes expressApi.bodyFields: | Field | Required | table for req.body
    - If FACT_SHEET includes expressApi.routeParams: | Param | | table for req.params
    - If FACT_SHEET includes expressApi.queryParams: | Param | | table for req.query
    - NEVER render "(req, res, next)" as parameters. That is useless. If expressApi is present, use it.
    - If expressApi is present but all arrays are empty, write "No specific request fields detected."

  **Parameters** (non-Express functions only) — IF parameters exist: | Name | Type | Required | Description |
    Names/types verbatim from FACT_SHEET. IF zero parameters, write "Takes no parameters." — never an empty table.

  **Responses** (Express handlers only) — | Status | Meaning | for each res.status(N).json({...}) found in expressApi.responses.
    OMIT if responses array is empty.

  **Returns** (non-Express only) — type from FACT_SHEET + what it contains. OMIT for void/undefined unless notable.

  **Throws** — IF throws listed in FACT_SHEET: "May throw: \`X\`". OMIT if none.

  **Behavior & side effects** — Key runtime logic. For any function that:
    • Writes to a collection OTHER than the primary one (e.g. inventory decrement, notification creation) → list each write explicitly.
    • Enforces authorization (role checks, ownership checks) → state who is allowed and what returns 403.
    • Enforces state-machine transitions (e.g. valid status values, what transitions are allowed) → list them.
    • Emits real-time events (Socket.io, SSE, WebSocket) → name the event and its payload shape.
    • Sends notifications → describe when and to whom.
    These are the facts developers most need. Be explicit, not vague ("updates inventory" is wrong; "decrements product.availableQuantity" is right).

  **Usage** — ONE realistic scenario: Express route in a router file, React hook in a component, async call with try/catch when it throws. One contextual example beats three trivial stubs.

ABSOLUTE RULES:
  • Do NOT add title, overview, or configuration — those are already written.
  • Never invent parameter names, types, throws, or endpoint paths not in FACT_SHEET.
  • NEVER render a table with headers and zero data rows. Omit the section or write prose instead.
  • If @deprecated in COMMENTS, lead with ⚠️ Deprecated: <message>.
  • Markdown only. No preamble or trailing commentary.
  • You MUST document every unit in the UNITS array — do not skip any.`;

interface UnitPayload {
  fileName: string;
  role: string;
  signals: string[];
  factSheet: unknown;
  comments: {
    fileLevel: string[];
    perDeclaration: Array<{ name: string; jsdoc: unknown | null; inlineComments: string[] }>;
  };
  source: string;
}

function buildUnits(structure: Structure, rawFiles: Array<{ name: string; content: string }>): UnitPayload[] {
  const sourceByName = new Map(rawFiles.map((f) => [f.name, f.content]));
  return structure.files.map((f, idx) => {
    const cls = structure.classifications[idx];

    const perDeclaration: UnitPayload['comments']['perDeclaration'] = [
      ...f.functions.map((fn) => ({ name: fn.name, jsdoc: fn.jsdoc ?? null, inlineComments: fn.inlineComments })),
      ...f.classes.flatMap((c) => [
        { name: c.name, jsdoc: c.jsdoc ?? null, inlineComments: [] as string[] },
        ...c.methods.map((m) => ({ name: `${c.name}.${m.name}`, jsdoc: m.jsdoc ?? null, inlineComments: m.inlineComments })),
      ]),
      ...f.interfaces.map((i) => ({ name: i.name, jsdoc: i.jsdoc ?? null, inlineComments: [] as string[] })),
    ].filter((d) => d.jsdoc !== null || d.inlineComments.length > 0);

    const factSheet = {
      language: f.language,
      directives: f.directives,
      exports: f.exports,
      imports: f.imports,
      envVars: f.envVars,
      functions: f.functions.map((fn) => ({
        name: fn.name,
        exported: fn.exported,
        async: fn.async,
        params: fn.params,
        returnType: fn.returnType,
        throws: fn.throws,
        docDescription: fn.jsdoc?.description ?? fn.doc ?? null,
        // Express-specific: surface the real HTTP API so the LLM documents it correctly
        expressApi: fn.expressApi ?? null,
        httpRoute: fn.jsdoc?.route ?? null,
        httpAccess: fn.jsdoc?.access ?? null,
      })),
      classes: f.classes.map((c) => ({
        name: c.name,
        extends: c.superClass,
        methods: c.methods.map((m) => ({ name: m.name, params: m.params, returnType: m.returnType, throws: m.throws, expressApi: m.expressApi ?? null })),
        properties: c.properties,
      })),
      interfaces: f.interfaces,
      react: f.react.isReact ? f.react : undefined,
    };

    const source = sourceByName.get(f.fileName) ?? f.raw ?? '';
    return {
      fileName: f.fileName,
      role: cls?.label ?? 'Module',
      signals: cls?.signals ?? [],
      factSheet,
      comments: { fileLevel: f.comments.slice(0, 5), perDeclaration },
      source: source.length > SOURCE_CAP ? `${source.slice(0, SOURCE_CAP)}\n/* …truncated… */` : source,
    };
  });
}

async function callLLM(
  systemPrompt: string,
  userContent: string,
  signal: AbortSignal,
  maxTokens: number,
): Promise<string | null> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.groq.apiKey}` },
    body: JSON.stringify({
      model: env.groq.model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

function extractDerivedTitle(headMarkdown: string, hintTitle: string): string {
  const match = headMarkdown.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : hintTitle;
}

/** Count ### headings in the LLM output — used for completeness check. */
function countH3(markdown: string): number {
  return (markdown.match(/^###\s/gm) ?? []).length;
}

async function runHeadSynthesis(
  structure: Structure,
  rawFiles: Array<{ name: string; content: string }>,
  signal: AbortSignal,
): Promise<{ headMarkdown: string; derivedTitle: string } | null> {
  const sourceByName = new Map(rawFiles.map((f) => [f.name, f.content]));

  const declarationSummary = structure.files.map((f, idx) => {
    const cls = structure.classifications[idx];
    const source = sourceByName.get(f.fileName) ?? f.raw ?? '';
    return {
      fileName: f.fileName,
      role: cls?.label ?? 'Module',
      fileComments: f.comments.slice(0, 3),
      envVars: f.envVars,
      imports: f.imports.map((im) => im.source),
      declarations: [
        ...f.functions.map((fn) => ({
          kind: 'function' as const,
          name: fn.name,
          exported: fn.exported,
          async: fn.async,
          params: fn.params.map((p) => `${p.name}: ${p.type ?? '?'}`),
          returnType: fn.returnType,
          throws: fn.throws,
          purpose: fn.jsdoc?.description ?? fn.doc ?? null,
          route: fn.jsdoc?.route ?? null,
          access: fn.jsdoc?.access ?? null,
        })),
        ...f.classes.map((c) => ({ kind: 'class' as const, name: c.name, extends: c.superClass, purpose: c.jsdoc?.description ?? c.doc ?? null, methods: c.methods.map((m) => m.name) })),
        ...f.interfaces.map((i) => ({ kind: i.kind as 'interface' | 'type', name: i.name, purpose: i.jsdoc?.description ?? i.doc ?? null })),
      ],
      source: source.length > HEAD_SOURCE_CAP ? `${source.slice(0, HEAD_SOURCE_CAP)}\n/* …truncated… */` : source,
    };
  });

  const noteSections = structure.notes.sections.map((s) => ({ section: s.title, points: s.blocks.map((b) => b.text) }));

  const userContent = [
    `HINT_TITLE: ${structure.title}`,
    '',
    'DEVELOPER NOTES:',
    '```json',
    JSON.stringify(noteSections, null, 2),
    '```',
    '',
    'FILE SUMMARY:',
    '```json',
    JSON.stringify(declarationSummary, null, 2),
    '```',
  ].join('\n');

  const headMarkdown = await callLLM(HEAD_SYSTEM_PROMPT, userContent, signal, MAX_TOKENS_HEAD).catch(() => null);
  if (!headMarkdown) return null;
  return { headMarkdown, derivedTitle: extractDerivedTitle(headMarkdown, structure.title) };
}

async function runUnitSynthesis(
  structure: Structure,
  rawFiles: Array<{ name: string; content: string }>,
  signal: AbortSignal,
): Promise<{ markdown: string; unitCount: number; documentedCount: number } | null> {
  const units = buildUnits(structure, rawFiles);
  if (units.length === 0) return null;

  const noteSections = structure.notes.sections.map((s) => ({ section: s.title, points: s.blocks.map((b) => b.text) }));

  // FIX 2: explicitly tell the model how many units to document
  const unitNames = units.flatMap((u) =>
    (u.factSheet as { functions?: Array<{ name: string }> }).functions?.map((fn) => fn.name) ?? [],
  );
  const unitCount = unitNames.length;

  const userContent = [
    `UNITS TO DOCUMENT (${unitCount} total — you must document ALL of them: ${unitNames.join(', ')}):`,
    '```json',
    JSON.stringify(units, null, 2),
    '```',
    '',
    'DEVELOPER NOTES (context only):',
    '```json',
    JSON.stringify(noteSections, null, 2),
    '```',
    '',
    'COMMENTS are authoritative for intent. FACT_SHEET is authoritative for types.',
    `You MUST produce exactly ${unitCount} ### sections — one for every function listed above.`,
    'Begin directly with the first ### heading.',
  ].join('\n');

  const markdown = await callLLM(UNIT_SYSTEM_PROMPT, userContent, signal, MAX_TOKENS_UNITS);
  if (!markdown) return null;

  return { markdown, unitCount, documentedCount: countH3(markdown) };
}

export async function synthesize(
  structure: Structure,
  rawFiles: Array<{ name: string; content: string }> = [],
): Promise<SynthesisResult> {
  if (!env.llmAvailable) return { llmMarkdown: null, llmAvailable: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const [headResult, unitResult] = await Promise.all([
      runHeadSynthesis(structure, rawFiles, controller.signal).catch(() => null),
      runUnitSynthesis(structure, rawFiles, controller.signal).catch(() => null),
    ]);

    if (!headResult && !unitResult) {
      return { llmMarkdown: null, llmAvailable: true, llmError: 'Both synthesis passes returned empty.' };
    }

    const parts: string[] = [];
    parts.push(headResult?.headMarkdown?.trim() ?? `# ${structure.title}`);

    if (unitResult?.markdown) {
      parts.push('', '---', '', '## API Reference', '');

      // FIX 2: append a completeness warning when units are missing from output
      const { markdown, unitCount, documentedCount } = unitResult;
      parts.push(markdown.trim());

      if (documentedCount < unitCount) {
        parts.push('');
        parts.push(`> ⚠️ **Incomplete documentation:** ${documentedCount} of ${unitCount} functions were documented above. Check server logs for details.`);
      }
    }

    const llmMarkdown = parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';

    return {
      llmMarkdown,
      llmAvailable: true,
      derivedTitle: headResult?.derivedTitle,
      unitCount: unitResult?.unitCount,
      documentedCount: unitResult?.documentedCount,
    };
  } catch (err) {
    const message = (err as Error).name === 'AbortError' ? 'LLM request timed out' : (err as Error).message;
    return { llmMarkdown: null, llmAvailable: true, llmError: message };
  } finally {
    clearTimeout(timer);
  }
}
