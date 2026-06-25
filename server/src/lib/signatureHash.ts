import crypto from 'node:crypto';
import type { ParsedFile, ParsedParam } from '../services/astParser';

/**
 * Produce a deterministic string that captures all exported function/method
 * signatures (name, params, return type) — sorted and normalised so that:
 *   • whitespace / comment changes → SAME hash
 *   • renamed param / added param / changed return type → DIFFERENT hash
 *
 * Only exported declarations are included; internal helpers are ignored because
 * a caller cannot observe their signature change.
 */

export interface SignatureEntry {
  name: string;
  /** Normalised serialisation used for comparison. */
  sig: string;
}

function serializeParam(p: ParsedParam): string {
  const base = `${p.name}:${p.type ?? '?'}${p.optional ? '?' : ''}`;
  if (p.properties && p.properties.length > 0) {
    const inner = p.properties
      .map((pp) => `${pp.name}:${pp.type ?? '?'}${pp.optional ? '?' : ''}`)
      .sort()
      .join(',');
    return `${base}{${inner}}`;
  }
  return base;
}

function serializeFn(name: string, params: ParsedParam[], returnType: string | null): string {
  const ps = params.map(serializeParam).join(',');
  return `fn:${name}(${ps}):${returnType ?? '?'}`;
}

/** Extract per-entry signatures for diffing (which names changed). */
export function extractSignatureEntries(parsed: ParsedFile): SignatureEntry[] {
  const entries: SignatureEntry[] = [];

  for (const fn of parsed.functions) {
    if (fn.exported) entries.push({ name: fn.name, sig: serializeFn(fn.name, fn.params, fn.returnType) });
  }

  for (const cls of parsed.classes) {
    const isExported = parsed.exports.some((e) => e.name === cls.name);
    if (!isExported) continue;
    for (const m of cls.methods) {
      const qName = `${cls.name}.${m.name}`;
      entries.push({ name: qName, sig: serializeFn(qName, m.params, m.returnType) });
    }
  }

  for (const iface of parsed.interfaces) {
    const isExported = parsed.exports.some((e) => e.name === iface.name);
    if (!isExported) continue;
    const memberParts = iface.members
      .map((m) => `${m.name}:${m.type ?? '?'}${m.optional ? '?' : ''}`)
      .sort();
    entries.push({ name: iface.name, sig: `${iface.kind}:${iface.name}{${memberParts.join(',')}}` });
  }

  return entries;
}

/**
 * Given two sets of signature entries, return the names of declarations that
 * were added, removed, or whose signature changed.
 */
export function diffSignatures(old: SignatureEntry[], next: SignatureEntry[]): string[] {
  const oldMap = new Map(old.map((e) => [e.name, e.sig]));
  const nextMap = new Map(next.map((e) => [e.name, e.sig]));
  const changed: string[] = [];

  for (const [name, sig] of oldMap) {
    if (!nextMap.has(name)) changed.push(`${name} (removed)`);
    else if (nextMap.get(name) !== sig) changed.push(`${name} (signature changed)`);
  }
  for (const name of nextMap.keys()) {
    if (!oldMap.has(name)) changed.push(`${name} (added)`);
  }
  return changed.sort();
}

export function computeSignatureHash(parsed: ParsedFile): string {
  const parts = extractSignatureEntries(parsed).map((e) => e.sig).sort();
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Compute a signature hash directly from source code by parsing it on-the-fly.
 * Returns null if the file cannot be parsed.
 */
export function computeSignatureHashFromSource(fileName: string, content: string): string | null {
  try {
    // Lazy import to avoid circular deps
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { parseFile } = require('../services/astParser') as typeof import('../services/astParser');
    const parsed = parseFile(fileName, content);
    return computeSignatureHash(parsed);
  } catch {
    return null;
  }
}
