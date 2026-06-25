import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/services/astParser';
import { computeSignatureHash } from '../src/lib/signatureHash';

const SOURCE_A = `
export function greet(name: string): string { return 'Hello ' + name; }
export function add(a: number, b: number): number { return a + b; }
`;

// Same signatures, different body — should produce the SAME hash.
const SOURCE_A_IMPL_CHANGE = `
export function greet(name: string): string {
  // Refactored to use template literals
  return \`Hello \${name}\`;
}
export function add(a: number, b: number): number {
  const result = a + b;
  return result;
}
`;

// Renamed parameter — should produce a DIFFERENT hash.
const SOURCE_B_RENAMED_PARAM = `
export function greet(fullName: string): string { return 'Hello ' + fullName; }
export function add(a: number, b: number): number { return a + b; }
`;

// Added parameter — should produce a DIFFERENT hash.
const SOURCE_C_ADDED_PARAM = `
export function greet(name: string, title?: string): string { return 'Hello ' + name; }
export function add(a: number, b: number): number { return a + b; }
`;

// Changed return type — should produce a DIFFERENT hash.
const SOURCE_D_CHANGED_RETURN = `
export function greet(name: string): void { console.log('Hello ' + name); }
export function add(a: number, b: number): number { return a + b; }
`;

// Non-exported helper added — should NOT affect the hash.
const SOURCE_E_INTERNAL_HELPER = `
export function greet(name: string): string { return helper(name); }
export function add(a: number, b: number): number { return a + b; }
function helper(s: string): string { return s.toUpperCase(); }
`;

function hash(src: string) {
  return computeSignatureHash(parseFile('test.ts', src));
}

describe('signatureHash stability', () => {
  it('produces the same hash for identical source', () => {
    expect(hash(SOURCE_A)).toBe(hash(SOURCE_A));
  });

  it('produces the same hash when only the implementation changes (body rewritten, signatures identical)', () => {
    expect(hash(SOURCE_A)).toBe(hash(SOURCE_A_IMPL_CHANGE));
  });

  it('produces a DIFFERENT hash when a parameter is renamed', () => {
    expect(hash(SOURCE_A)).not.toBe(hash(SOURCE_B_RENAMED_PARAM));
  });

  it('produces a DIFFERENT hash when a parameter is added', () => {
    expect(hash(SOURCE_A)).not.toBe(hash(SOURCE_C_ADDED_PARAM));
  });

  it('produces a DIFFERENT hash when the return type changes', () => {
    expect(hash(SOURCE_A)).not.toBe(hash(SOURCE_D_CHANGED_RETURN));
  });

  it('produces the SAME hash when only an internal (non-exported) helper is added', () => {
    expect(hash(SOURCE_A)).toBe(hash(SOURCE_E_INTERNAL_HELPER));
  });

  it('is order-independent (same exports, different declaration order)', () => {
    const REVERSED = `
export function add(a: number, b: number): number { return a + b; }
export function greet(name: string): string { return 'Hello ' + name; }
`;
    expect(hash(SOURCE_A)).toBe(hash(REVERSED));
  });
});
