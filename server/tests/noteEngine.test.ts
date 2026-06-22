import { describe, it, expect } from 'vitest';
import { processNotes } from '../src/services/noteEngine';

describe('noteEngine', () => {
  it('categorises notes into ordered sections', () => {
    const notes = [
      'Overview: this module powers the checkout cart.',
      'Install with npm install @shop/cart',
      'Usage: call formatPrice(1999) to render a tag',
      'GET /api/cart returns the cart as JSON',
      'TODO: persistence is in-memory only',
    ].join('\n');

    const result = processNotes(notes);
    const ids = result.sections.map((s) => s.id);
    expect(ids).toEqual(['overview', 'installation', 'usage', 'api', 'todo']);
    expect(result.stats.blockCount).toBe(5);
  });

  it('routes installation keywords to the Installation section', () => {
    const result = processNotes('Run npm install and set up your .env file');
    expect(result.sections[0].id).toBe('installation');
  });

  it('detects API notes via HTTP verbs and routes', () => {
    const result = processNotes('POST /api/users accepts a payload and returns the created user');
    expect(result.sections.some((s) => s.id === 'api')).toBe(true);
  });

  it('flags TODO/FIXME strongly', () => {
    const result = processNotes('FIXME: handle rate limiting before launch');
    expect(result.sections[0].id).toBe('todo');
  });

  it('keeps fenced code blocks intact under Usage', () => {
    const notes = 'Example usage:\n```ts\nconst x = add(1, 2);\n```';
    const result = processNotes(notes);
    const usage = result.sections.find((s) => s.id === 'usage');
    expect(usage).toBeTruthy();
    expect(usage?.blocks.some((b) => b.code && b.text.includes('add(1, 2)'))).toBe(true);
  });

  it('handles empty input', () => {
    const result = processNotes('');
    expect(result.sections).toEqual([]);
    expect(result.stats.blockCount).toBe(0);
  });
});