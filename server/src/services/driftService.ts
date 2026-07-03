import { getFile, getFileSha, getBlobContent, parseRepo } from './githubService';
import { computeSignatureHash, extractSignatureEntries, diffSignatures } from '../lib/signatureHash';
import { parseFile } from './astParser';
import type { DocRec, SourceBinding } from '../lib/dataStore';

/**
 * Three-state drift model:
 *
 *   current               — commitSha matches AND signatureHash matches (or no hash stored yet).
 *   implementation_changed — file changed (new commitSha) but API surface is the same (same signatureHash).
 *   signature_changed      — file changed AND exported signatures differ — docs are likely wrong.
 */
export type DriftState = 'current' | 'implementation_changed' | 'signature_changed';

export interface ChangedFile {
  path: string;
  oldSha: string;
  newSha: string;
  driftState: DriftState;
  changedAt: string;
  /** Which specific exported names were added, removed, or had their signature changed. */
  changedFunctions: string[];
}

export interface DriftResult {
  /** True when at least one file is not 'current'. Kept for backwards compat. */
  isOutdated: boolean;
  worstState: DriftState;
  changedFiles: ChangedFile[];
}

// In-process cache so the banner re-renders without re-fetching GitHub on every route change.
const stateCache = new Map<string, DriftState>();

export function getCachedDriftState(docId: string): DriftState {
  return stateCache.get(docId) ?? 'current';
}

/** Call after regenerate — mark the doc as fully current. */
export function clearDrift(docId: string): void {
  stateCache.set(docId, 'current');
}

/**
 * Dev/demo helper: set the in-memory cache to 'signature_changed' so the UI
 * can show the drift banner without an actual upstream change.
 */
export function simulateDrift(doc: DocRec): number {
  if (doc.sourceBindings.length > 0) {
    stateCache.set(doc.docId, 'signature_changed');
  }
  return doc.sourceBindings.length;
}

/** True when the in-memory cache says this doc is outdated. */
export function isFlaggedOutdated(docId: string): boolean {
  const s = stateCache.get(docId);
  return s === 'implementation_changed' || s === 'signature_changed';
}

function worstOf(a: DriftState, b: DriftState): DriftState {
  const rank: Record<DriftState, number> = { current: 0, implementation_changed: 1, signature_changed: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export async function checkDrift(doc: DocRec, token: string | null): Promise<DriftResult> {
  const changedFiles: ChangedFile[] = [];
  let worst: DriftState = 'current';

  for (const b of doc.sourceBindings) {
    const { owner, repo } = parseRepo(b.repoFullName);

    // 1. Compare blob SHAs — cheap HEAD check first.
    const currentSha = (await getFileSha(token, owner, repo, b.path, b.branch)) ?? b.commitSha;
    if (currentSha === b.commitSha) continue;

    // 2. The file has changed.  Fetch the new content to understand HOW.
    let fileState: DriftState = 'implementation_changed';
    let changedFunctions: string[] = [];

    if (token) {
      try {
        const { content: newContent } = await getFile(token, owner, repo, b.path, b.branch);
        const newParsed = parseFile(b.path, newContent);
        const newHash = computeSignatureHash(newParsed);

        // Determine state from the signature hash (if we have one stored).
        const hashMismatch = b.signatureHash ? newHash !== b.signatureHash : false;

        if (hashMismatch || !b.signatureHash) {
          // Try to diff exactly which functions changed using the old blob.
          // b.commitSha IS a blob SHA — the Git Blobs API accepts this directly.
          try {
            const oldContent = await getBlobContent(token, owner, repo, b.commitSha);
            const oldParsed = parseFile(b.path, oldContent);
            const oldEntries = extractSignatureEntries(oldParsed);
            const newEntries = extractSignatureEntries(newParsed);
            const diff = diffSignatures(oldEntries, newEntries);

            if (diff.length > 0) {
              fileState = 'signature_changed';
              changedFunctions = diff;
            } else if (hashMismatch) {
              // Hash says it changed but diff says same — treat as implementation change
              fileState = 'implementation_changed';
            }
            // If no stored hash AND no signature diff → implementation_changed (body changed, API same)
          } catch {
            // Blob unavailable — rely on the hash comparison alone.
            if (hashMismatch) {
              fileState = 'signature_changed';
              changedFunctions = ['(signature details unavailable)'];
            }
            // Otherwise stay as implementation_changed
          }
        }
        // If storedHash matches newHash → implementation_changed (already the default)
      } catch {
        // Cannot fetch the new content — conservative escalation.
        fileState = 'signature_changed';
        changedFunctions = ['(content unavailable — check network/token)'];
      }
    }

    changedFiles.push({
      path: b.path,
      oldSha: b.commitSha,
      newSha: currentSha,
      driftState: fileState,
      changedAt: new Date().toISOString(),
      changedFunctions,
    });

    worst = worstOf(worst, fileState);
  }

  stateCache.set(doc.docId, worst);
  return { isOutdated: worst !== 'current', worstState: worst, changedFiles };
}

/**
 * Re-fetch current source files for all bindings.
 * Returns updated file contents and new SourceBindings with fresh commitSha.
 * signatureHash is NOT updated here — the caller (regenerate) must recompute it.
 */
export async function pullCurrentSource(
  doc: DocRec,
  token: string | null,
): Promise<{ files: Array<{ name: string; content: string }>; newBindings: SourceBinding[] }> {
  const files: Array<{ name: string; content: string }> = [];
  const newBindings: SourceBinding[] = [];

  for (const b of doc.sourceBindings) {
    const { owner, repo } = parseRepo(b.repoFullName);
    const f = await getFile(token, owner, repo, b.path, b.branch);
    files.push({ name: b.path, content: f.content });
    newBindings.push({ ...b, commitSha: f.sha });
  }

  return { files, newBindings };
}
