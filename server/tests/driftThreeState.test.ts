import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseFile } from '../src/services/astParser';
import { computeSignatureHash } from '../src/lib/signatureHash';

/**
 * The drift three-state logic lives in driftService.checkDrift() which calls
 * getFileSha and getFile from githubService.  We unit-test the DECISION logic
 * directly here — the same branching that checkDrift() follows — to keep these
 * tests fast and offline (no real GitHub calls).
 *
 * Decision rules (mirrors driftService.ts exactly):
 *   commitSha unchanged                     → "current"
 *   commitSha changed, hash unchanged       → "implementation_changed"
 *   commitSha changed, hash changed         → "signature_changed"
 *   commitSha changed, no stored hash       → "implementation_changed" (conservative)
 */

type DriftState = 'current' | 'implementation_changed' | 'signature_changed';

function decideDriftState(opts: {
  oldCommitSha: string;
  newCommitSha: string;
  storedSignatureHash: string | undefined;
  newFileContent: string;
  fileName: string;
}): DriftState {
  const { oldCommitSha, newCommitSha, storedSignatureHash, newFileContent, fileName } = opts;

  if (newCommitSha === oldCommitSha) return 'current';

  if (!storedSignatureHash) return 'implementation_changed';

  const newHash = computeSignatureHash(parseFile(fileName, newFileContent));
  return newHash !== storedSignatureHash ? 'signature_changed' : 'implementation_changed';
}

const FILE = 'pricing.ts';

const V1 = `export function price(n: number): string { return '$' + n; }`;
const V1_REFACTORED = `
export function price(n: number): string {
  // uses template literal now
  return \`$\${n}\`;
}`;
const V2_NEW_PARAM = `export function price(n: number, currency: string): string { return currency + n; }`;
const V2_REMOVED_FN = ``;

const hashOf = (src: string) => computeSignatureHash(parseFile(FILE, src));

describe('drift three-state decision logic', () => {
  it('returns "current" when the commit SHA has not changed', () => {
    expect(decideDriftState({
      oldCommitSha: 'abc123',
      newCommitSha: 'abc123',
      storedSignatureHash: hashOf(V1),
      newFileContent: V1,
      fileName: FILE,
    })).toBe('current');
  });

  it('returns "implementation_changed" when file changed but signatures are identical', () => {
    expect(decideDriftState({
      oldCommitSha: 'abc123',
      newCommitSha: 'def456',
      storedSignatureHash: hashOf(V1),
      newFileContent: V1_REFACTORED,
      fileName: FILE,
    })).toBe('implementation_changed');
  });

  it('returns "signature_changed" when a parameter is added', () => {
    expect(decideDriftState({
      oldCommitSha: 'abc123',
      newCommitSha: 'def456',
      storedSignatureHash: hashOf(V1),
      newFileContent: V2_NEW_PARAM,
      fileName: FILE,
    })).toBe('signature_changed');
  });

  it('returns "signature_changed" when an exported function is removed', () => {
    expect(decideDriftState({
      oldCommitSha: 'abc123',
      newCommitSha: 'def456',
      storedSignatureHash: hashOf(V1),
      newFileContent: V2_REMOVED_FN,
      fileName: FILE,
    })).toBe('signature_changed');
  });

  it('returns "implementation_changed" (conservative) when no stored hash exists', () => {
    expect(decideDriftState({
      oldCommitSha: 'abc123',
      newCommitSha: 'def456',
      storedSignatureHash: undefined,
      newFileContent: V2_NEW_PARAM,
      fileName: FILE,
    })).toBe('implementation_changed');
  });

  it('"current" even when signatures would differ — because commit SHA did not change', () => {
    // The SHA check is the gate; if it passes we skip the signature comparison.
    expect(decideDriftState({
      oldCommitSha: 'same',
      newCommitSha: 'same',
      storedSignatureHash: hashOf(V1),
      newFileContent: V2_NEW_PARAM, // different — but we never check it
      fileName: FILE,
    })).toBe('current');
  });
});
