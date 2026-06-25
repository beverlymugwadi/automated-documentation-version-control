import { processNotes, type NoteResult } from './noteEngine';
import { parseFiles, type ParsedFile, type ParsedFunction } from './astParser';
import { classifyFile, type Classification } from './classifier';
import type { ParsedJsdoc } from '../lib/jsdocParser';

export interface ComposeInput {
  title: string;
  notes: string;
  files: Array<{ name: string; content: string }>;
  sourceRepo?: string;
  sourceCommit?: string;
}

export interface ComposeResult {
  markdown: string;
  structure: {
    title: string;
    notes: NoteResult;
    files: ParsedFile[];
    classifications: Classification[];
    parseErrors: Array<{ fileName: string; message: string; line: number | null }>;
    generatedAt: string;
  };
}

function fmtParams(fn: ParsedFunction): string {
  return fn.params.map((p) => `${p.name}${p.optional ? '?' : ''}${p.type ? `: ${p.type}` : ''}`).join(', ');
}

function signature(fn: ParsedFunction): string {
  return `${fn.async ? 'async ' : ''}${fn.name}(${fmtParams(fn)})${fn.returnType ? `: ${fn.returnType}` : ''}`;
}

function jsdocParamDesc(jsdoc: ParsedJsdoc | null | undefined, paramName: string): string {
  if (!jsdoc) return '';
  const bare = paramName.replace(/^[\.\[{].*/, '').replace(/^\.\.\./, '');
  const match = jsdoc.params.find((p) => p.name === bare || p.name === paramName || bare.startsWith(p.name));
  return match?.description ?? '';
}

function isVoidReturn(returnType: string | null): boolean {
  return returnType === null || returnType === 'void' || returnType === 'undefined';
}

function renderFunction(fn: ParsedFunction, lines: string[]): void {
  const jsdoc = fn.jsdoc;
  const hasRoute = !!(jsdoc?.route);
  const hasAccess = !!(jsdoc?.access);

  // ── Heading ──────────────────────────────────────────────────────────────
  if (hasRoute) {
    // Express handler: lead with the HTTP verb + path + access level
    const routeStr = `${jsdoc!.route!.method} ${jsdoc!.route!.path}`;
    const accessStr = hasAccess ? `  ·  ${jsdoc!.access}` : '';
    lines.push(`#### \`${fn.name}\` — ${routeStr}${accessStr}`, '');
  } else {
    lines.push(`#### \`${fn.name}\`${fn.exported ? '' : ' _(internal)_'}`, '');
  }

  if (jsdoc?.deprecated) lines.push(`> ⚠️ **Deprecated:** ${jsdoc.deprecated}`, '');

  // Description from @desc / @description / leading comment
  const description = jsdoc?.description || fn.doc;
  if (description) lines.push(description, '');
  if (fn.inlineComments.length > 0) {
    lines.push(`_Notes: ${fn.inlineComments.slice(0, 3).join(' · ')}_`, '');
  }

  // Signature — always shown for reference
  lines.push('```js', signature(fn), '```', '');

  // ── Parameters / Request surface ─────────────────────────────────────────
  if (fn.expressApi) {
    const api = fn.expressApi;
    const hasBody = api.bodyFields.length > 0;
    const hasRoute2 = api.routeParams.length > 0;
    const queryList = api.queryParams;

    if (hasBody) {
      lines.push('**Request body** (`req.body`):', '');
      lines.push('| Field | Required |', '| --- | --- |');
      for (const f of api.bodyFields) lines.push(`| \`${f}\` | yes |`);
      lines.push('');
    }
    if (hasRoute2) {
      lines.push('**Path parameters** (`req.params`):', '');
      lines.push('| Param | Description |', '| --- | --- |');
      for (const p of api.routeParams) lines.push(`| \`${p}\` | |`);
      lines.push('');
    }
    if (queryList.length > 0) {
      lines.push('**Query parameters** (`req.query`):', '');
      lines.push('| Param | Description |', '| --- | --- |');
      for (const q of queryList) lines.push(`| \`${q}\` | |`);
      lines.push('');
    }
    if (!hasBody && !hasRoute2 && queryList.length === 0) {
      lines.push('Takes no parameters.', '');
    }
  } else if (fn.params.length > 0) {
    lines.push('| Parameter | Type | Required | Description |', '| --- | --- | --- | --- |');
    for (const p of fn.params) {
      const desc = jsdocParamDesc(jsdoc, p.name);
      lines.push(`| \`${p.name}\` | ${p.type ?? '—'} | ${p.optional ? 'no' : 'yes'} | ${desc} |`);
    }
    lines.push('');
  } else {
    lines.push('Takes no parameters.', '');
  }

  // ── Responses (Express handlers only) ────────────────────────────────────
  if (fn.expressApi && fn.expressApi.responses.length > 0) {
    lines.push('**Responses:**', '');
    lines.push('| Status | Shape |', '| --- | --- |');
    for (const r of fn.expressApi.responses) {
      lines.push(`| \`${r.status}\` | \`${r.shape}\` |`);
    }
    lines.push('');
  }

  // ── Returns (non-Express only) ────────────────────────────────────────────
  if (!fn.expressApi) {
    const returnsDesc = jsdoc?.returns ?? null;
    if (!isVoidReturn(fn.returnType) || returnsDesc) {
      lines.push(`**Returns:** \`${fn.returnType ?? 'unknown'}\`${returnsDesc ? ` — ${returnsDesc}` : ''}`, '');
    }
  }

  // ── Throws ────────────────────────────────────────────────────────────────
  if (fn.throws.length > 0) {
    lines.push(`**Throws:** ${fn.throws.map((t) => `\`${t}\``).join(', ')}`, '');
  }

  // ── Examples from JSDoc ───────────────────────────────────────────────────
  if (jsdoc?.examples && jsdoc.examples.length > 0) {
    lines.push('**Example:**', '');
    for (const ex of jsdoc.examples) {
      lines.push(ex.trim().startsWith('```') ? ex : `\`\`\`js\n${ex}\n\`\`\``, '');
    }
  }
}

export function compose(input: ComposeInput): ComposeResult {
  const notes = processNotes(input.notes ?? '');
  const { parsed, errors } = parseFiles(input.files ?? []);
  const classifications = parsed.map((f) => classifyFile(f));
  const generatedAt = new Date().toISOString();

  const lines: string[] = [];
  const push = (...xs: string[]) => lines.push(...xs);

  push(`# ${input.title}`, '');
  push(`> Generated by ADGVC · ${new Date(generatedAt).toUTCString()}`, '');

  for (const section of notes.sections) {
    push(`## ${section.title}`, '');
    for (const block of section.blocks) {
      if (block.code) push(block.text, '');
      else push(`- ${block.text}`);
    }
    push('');
  }

  // FIX 6: Configuration section only when env vars are actually present.
  const allEnvVars = [...new Set(parsed.flatMap((f) => f.envVars))].sort();
  if (allEnvVars.length > 0) {
    push('## Configuration', '');
    push('The following environment variables are read by this module:', '');
    push('| Variable | Notes |', '| --- | --- |');
    for (const v of allEnvVars) push(`| \`${v}\` | |`);
    push('');
  }

  const totalFns = parsed.reduce((n, f) => n + f.functions.length, 0);
  const totalClasses = parsed.reduce((n, f) => n + f.classes.length, 0);
  const totalIfaces = parsed.reduce((n, f) => n + f.interfaces.length, 0);

  if (parsed.length) {
    push('## API Reference', '');
    push(`Parsed **${parsed.length}** file(s): ${totalFns} function(s), ${totalClasses} class(es), ${totalIfaces} interface/type(s).`, '');

    parsed.forEach((file, idx) => {
      const role = classifications[idx];
      push(`### \`${file.fileName}\` · ${role.label}`, '');
      if (file.comments[0]) push(`_${file.comments[0]}_`, '');

      if (file.imports.length) {
        const deps = file.imports
          .map((im) => {
            const parts = [im.default, im.namespace ? `* as ${im.namespace}` : '', ...(im.named.length ? [`{ ${im.named.join(', ')} }`] : [])].filter(Boolean);
            return `\`${im.source}\`${parts.length ? ` (${parts.join(', ')})` : ''}`;
          })
          .join(', ');
        push(`**Dependencies:** ${deps}`, '');
      }

      if (file.react.isReact) {
        if (file.react.hooks.length) push(`**Hooks:** ${[...new Set(file.react.hooks.map((h) => h.name))].join(', ')}`);
        if (file.react.jsxElements.length) push(`**Renders:** ${file.react.jsxElements.slice(0, 12).join(', ')}`);
        if (file.react.eventHandlers.length) {
          push(`**Handlers:** ${file.react.eventHandlers.map((e) => `${e.event}${e.calls.length ? ` → ${e.calls.join('/')}` : ''}`).join(', ')}`);
        }
        push('');
      }

      if (file.functions.length) {
        push('**Functions**', '');
        for (const fn of file.functions) renderFunction(fn, lines);
      }

      for (const cls of file.classes) {
        push(`#### class \`${cls.name}\`${cls.superClass ? ` extends \`${cls.superClass}\`` : ''}`, '');
        if (cls.jsdoc?.description || cls.doc) push(cls.jsdoc?.description ?? cls.doc ?? '', '');
        if (cls.properties.length) {
          push('Properties:', '');
          for (const p of cls.properties) push(`- \`${p.static ? 'static ' : ''}${p.name}\`${p.type ? `: ${p.type}` : ''}`);
          push('');
        }
        for (const m of cls.methods) renderFunction({ ...m, name: `${cls.name}.${m.name}` }, lines);
      }

      for (const iface of file.interfaces) {
        push(`#### ${iface.kind} \`${iface.name}\``, '');
        const desc = iface.jsdoc?.description ?? iface.doc;
        if (desc) push(desc, '');
        // FIX 6: only render interface member table when there are members
        if (iface.members.length > 0) {
          push('| Field | Type | Required |', '| --- | --- | --- |');
          for (const m of iface.members) push(`| \`${m.name}\` | ${m.type ?? '—'} | ${m.optional ? 'no' : 'yes'} |`);
          push('');
        }
      }
    });
  }

  if (errors.length) {
    push('## Generation Notes', '');
    for (const e of errors) push(`- ⚠ Could not parse \`${e.fileName}\`${e.line ? ` (line ${e.line})` : ''}: ${e.message}`);
    push('');
  }

  push('---', '');
  const meta: string[] = [`Generated ${new Date(generatedAt).toUTCString()}`];
  if (input.sourceRepo) meta.push(`Source: \`${input.sourceRepo}\``);
  meta.push(input.sourceCommit ? `Commit: \`${input.sourceCommit}\`` : 'Commit: _pending first save_');
  push(`<sub>${meta.join(' · ')}</sub>`, '');

  const markdown = `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
  return {
    markdown,
    structure: { title: input.title, notes, files: parsed, classifications, parseErrors: errors, generatedAt },
  };
}
