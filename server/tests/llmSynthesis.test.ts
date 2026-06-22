import { describe, it, expect } from 'vitest';
import { synthesize } from '../src/services/llmSynthesis';
import { compose } from '../src/services/docComposer';

describe('llmSynthesis (no API key)', () => {
  it('returns rule-based only and flags llmAvailable: false', async () => {
    const files = [{ name: 'a.ts', content: 'export function add(a: number, b: number): number { return a + b; }' }];
    const { structure } = compose({ title: 'X', notes: 'Overview: a test.', files });

    const result = await synthesize(structure, files);
    expect(result.llmAvailable).toBe(false);
    expect(result.llmMarkdown).toBeNull();
  });
});