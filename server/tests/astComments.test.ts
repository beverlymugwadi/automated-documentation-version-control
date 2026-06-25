import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/services/astParser';

// ---------------------------------------------------------------------------
// Sample source that exercises every comment path we care about:
//   - JSDoc block with @param, @returns, @example, @deprecated
//   - Plain line comments on a function
//   - Inline // comment inside a function body
//   - Class with a JSDoc block on the class + a method
// ---------------------------------------------------------------------------
const SAMPLE = `
/**
 * Formats a price in minor currency units to a human-readable string.
 *
 * @param amount - The amount in minor units (e.g. cents).
 * @param currency - ISO 4217 currency code. Defaults to 'USD'.
 * @returns A locale-formatted price string.
 * @example
 * formatPrice(1999) // "$19.99"
 * @deprecated Use \`formatMoney\` from the new billing package instead.
 */
export function formatPrice(amount: number, currency = 'USD'): string {
  // Convert minor units to major units
  const major = amount / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(major);
}

/** Simple sum utility. */
export const sum = (a: number, b: number): number => a + b;

/**
 * Manages a shopping cart.
 */
export class Cart {
  private items: number[] = [];

  /**
   * Add an item price to the cart.
   * @param price - Item price in minor units.
   */
  add(price: number): void {
    // Track the item
    this.items.push(price);
  }
}
`;

describe('AST comment extraction', () => {
  const parsed = parseFile('pricing.ts', SAMPLE);

  it('extracts the formatPrice function', () => {
    const fn = parsed.functions.find((f) => f.name === 'formatPrice');
    expect(fn).toBeDefined();
  });

  it('captures JSDoc description for formatPrice', () => {
    const fn = parsed.functions.find((f) => f.name === 'formatPrice')!;
    expect(fn.jsdoc?.description).toMatch(/Formats a price/i);
  });

  it('captures @param tags for formatPrice', () => {
    const fn = parsed.functions.find((f) => f.name === 'formatPrice')!;
    expect(fn.jsdoc?.params).toHaveLength(2);
    const amountParam = fn.jsdoc?.params.find((p) => p.name === 'amount');
    expect(amountParam).toBeDefined();
    expect(amountParam?.description).toMatch(/minor units/i);
  });

  it('captures @returns tag for formatPrice', () => {
    const fn = parsed.functions.find((f) => f.name === 'formatPrice')!;
    expect(fn.jsdoc?.returns).toMatch(/locale-formatted/i);
  });

  it('captures @example tag for formatPrice', () => {
    const fn = parsed.functions.find((f) => f.name === 'formatPrice')!;
    expect(fn.jsdoc?.examples.length).toBeGreaterThan(0);
    expect(fn.jsdoc?.examples[0]).toMatch(/formatPrice/);
  });

  it('captures @deprecated tag for formatPrice', () => {
    const fn = parsed.functions.find((f) => f.name === 'formatPrice')!;
    expect(fn.jsdoc?.deprecated).toBeTruthy();
    expect(fn.jsdoc?.deprecated).toMatch(/formatMoney/);
  });

  it('captures inline comment inside formatPrice body', () => {
    const fn = parsed.functions.find((f) => f.name === 'formatPrice')!;
    const joined = fn.inlineComments.join(' ');
    expect(joined).toMatch(/Convert minor units/i);
  });

  it('captures plain JSDoc description on arrow function (sum)', () => {
    const fn = parsed.functions.find((f) => f.name === 'sum')!;
    expect(fn.jsdoc?.description).toMatch(/Simple sum/i);
  });

  it('extracts Cart class with JSDoc description', () => {
    const cls = parsed.classes.find((c) => c.name === 'Cart')!;
    expect(cls).toBeDefined();
    expect(cls.jsdoc?.description).toMatch(/shopping cart/i);
  });

  it('captures JSDoc on Cart.add method', () => {
    const cls = parsed.classes.find((c) => c.name === 'Cart')!;
    const method = cls.methods.find((m) => m.name === 'add')!;
    expect(method.jsdoc?.description).toMatch(/Add an item price/i);
    expect(method.jsdoc?.params[0]?.name).toBe('price');
  });

  it('captures inline comment inside Cart.add body', () => {
    const cls = parsed.classes.find((c) => c.name === 'Cart')!;
    const method = cls.methods.find((m) => m.name === 'add')!;
    const joined = method.inlineComments.join(' ');
    expect(joined).toMatch(/Track the item/i);
  });
});
