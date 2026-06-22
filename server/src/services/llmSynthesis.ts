import { env } from '../config/env';
import type { ComposeResult } from './docComposer';

type Structure = ComposeResult['structure'];

export interface SynthesisResult {
  llmMarkdown: string | null;
  llmAvailable: boolean;
  llmError?: string;
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 60_000;
const SOURCE_CAP = 7000;

const SYSTEM_PROMPT = `You are a senior technical writer producing reference documentation for a codebase.

For each unit you are given three inputs:
  • FACT_SHEET — structured facts extracted from the AST (exact names, parameters
    including destructured props, TS types, return types, hooks, JSX elements,
    event handlers, imports). This is the ONLY authority for types and signatures.
  • ROLE — a deterministic classification (e.g. "Next.js Error Boundary",
    "React Component", "API Endpoint"). Frame the documentation for this role.
  • SOURCE — the raw code of the unit. Use it to describe BEHAVIOUR only.

Produce clean Markdown. For every documented unit emit these sections, in order,
omitting a section only when it genuinely does not apply:

  ## <RoleLabel>: <name>
  **Purpose** — one or two sentences on what it is and when to use it.
  **Props / Params** — a Markdown table: | Name | Type | Required | Description |.
    Types and names MUST come verbatim from the FACT_SHEET (use destructured prop
    names and their types). Describe each from the source/notes.
  **Behavior** — what it does at runtime, derived from SOURCE (hooks, effects,
    branching, what handlers call). Do not speculate beyond the code.
  **Renders / Returns** — for components: the key elements rendered; for
    functions: the return value and its type from the FACT_SHEET.
  **Usage** — a short, realistic code example consistent with the real signature.
  **Dependencies** — notable imports grouped by source, from the FACT_SHEET.

ABSOLUTE RULES:
  • Never invent, rename, or alter names, parameters, types, return types, props,
    hooks, or endpoints not present in the FACT_SHEET.
  • Never claim behaviour not supported by the SOURCE.
  • Preserve signatures exactly. Output Markdown only — no preamble.`;

interface UnitPayload {
  fileName: string;
  role: string;
  signals: string[];
  factSheet: unknown;
  source: string;
}

function buildUnits(structure: Structure, rawFiles: Array<{ name: string; content: string }>): UnitPayload[] {
  const sourceByName = new Map(rawFiles.map((f) => [f.name, f.content]));
  return structure.files.map((f, idx) => {
    const cls = structure.classifications[idx];
    const factSheet = {
      language: f.language,
      directives: f.directives,
      exports: f.exports,
      imports: f.imports,
      functions: f.functions.map((fn) => ({
        name: fn.name,
        exported: fn.exported,
        async: fn.async,
        params: fn.params,
        returnType: fn.returnType,
        jsdoc: fn.doc,
      })),
      classes: f.classes.map((c) => ({
        name: c.name,
        extends: c.superClass,
        methods: c.methods.map((m) => ({ name: m.name, params: m.params, returnType: m.returnType })),
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
      source: source.length > SOURCE_CAP ? `${source.slice(0, SOURCE_CAP)}\n/* …truncated… */` : source,
    };
  });
}

export async function synthesize(
  structure: Structure,
  rawFiles: Array<{ name: string; content: string }> = [],
): Promise<SynthesisResult> {
  if (!env.llmAvailable) {
    return { llmMarkdown: null, llmAvailable: false };
  }

  const units = buildUnits(structure, rawFiles);
  const noteSections = structure.notes.sections.map((s) => ({ section: s.title, points: s.blocks.map((b) => b.text) }));

  const userContent = [
    `TITLE: ${structure.title}`,
    '',
    'DEVELOPER NOTES (categorised — use for Purpose/Usage context, not as type authority):',
    '```json',
    JSON.stringify(noteSections, null, 2),
    '```',
    '',
    'UNITS TO DOCUMENT (each has FACT_SHEET, ROLE, SOURCE):',
    '```json',
    JSON.stringify(units, null, 2),
    '```',
    '',
    'Begin the document with an "# " H1 title and a one-paragraph overview drawn',
    'from the notes, then one section per unit following the mandated template.',
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: env.openai.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { llmMarkdown: null, llmAvailable: true, llmError: `OpenAI ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { llmMarkdown: null, llmAvailable: true, llmError: 'Empty response from model' };
    return { llmMarkdown: content, llmAvailable: true };
  } catch (err) {
    const message = (err as Error).name === 'AbortError' ? 'LLM request timed out' : (err as Error).message;
    return { llmMarkdown: null, llmAvailable: true, llmError: message };
  } finally {
    clearTimeout(timer);
  }
}