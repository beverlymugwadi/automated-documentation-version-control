import { describe, it, expect } from 'vitest';
import { parseFile, parseFiles, AstParseError } from '../src/services/astParser';

describe('astParser', () => {
  it('extracts a documented, exported, typed function', () => {
    const code = `
      /** Adds two numbers together. */
      export function add(a: number, b: number = 0): number {
        return a + b;
      }
    `;
    const result = parseFile('math.ts', code);
    expect(result.language).toBe('typescript');
    expect(result.functions).toHaveLength(1);

    const fn = result.functions[0];
    expect(fn.name).toBe('add');
    expect(fn.exported).toBe(true);
    expect(fn.returnType).toBe('number');
    expect(fn.doc).toMatch(/adds two numbers/i);
    expect(fn.params).toEqual([
      { name: 'a', type: 'number', optional: false },
      { name: 'b', type: 'number', optional: true },
    ]);
  });

  it('extracts arrow functions and import summaries', () => {
    const code = `
      import { useState } from 'react';
      import axios from 'axios';
      export const greet = (name: string): string => 'hi ' + name;
    `;
    const result = parseFile('greet.ts', code);
    expect(result.functions.map((f) => f.name)).toContain('greet');
    expect(result.functions.find((f) => f.name === 'greet')?.kind).toBe('arrow');
    expect(result.imports).toEqual([
      { source: 'react', named: ['useState'] },
      { source: 'axios', default: 'axios', named: [] },
    ]);
  });

  it('expands destructured params with their TS types', () => {
    const code = `
      export default function Error({ error, reset }: { error: Error; reset: () => void }) {
        return null;
      }
    `;
    const result = parseFile('error.tsx', code);
    const fn = result.functions[0];
    expect(fn.params).toHaveLength(1);
    expect(fn.params[0].properties).toEqual([
      { name: 'error', type: 'Error', optional: false },
      { name: 'reset', type: 'function', optional: false },
    ]);
  });

  it('captures React facts: directives, hooks, JSX and event handlers', () => {
    const code = `
      'use client';
      import { useState } from 'react';
      export function Counter() {
        const [n, setN] = useState(0);
        return <button onClick={() => setN(n + 1)}>{n}</button>;
      }
    `;
    const result = parseFile('Counter.tsx', code);
    expect(result.directives).toContain('use client');
    expect(result.react.isReact).toBe(true);
    expect(result.react.hooks.map((h) => h.name)).toContain('useState');
    expect(result.react.jsxElements).toContain('button');
    const handler = result.react.eventHandlers.find((e) => e.event === 'onClick');
    expect(handler?.calls).toContain('setN');
  });

  it('captures raw node text for sparse files', () => {
    const result = parseFile('config.ts', `export const config = { a: 1 };`);
    expect(result.raw).toBeTruthy();
  });

  it('captures classes with methods, properties and inheritance', () => {
    const code = `
      class Animal { constructor(name) { this.name = name; } }
      export class Dog extends Animal {
        legs = 4;
        static species() { return 'canine'; }
        async fetch(item: string): Promise<string> { return item; }
      }
    `;
    const result = parseFile('animals.ts', code);
    const dog = result.classes.find((c) => c.name === 'Dog');
    expect(dog).toBeTruthy();
    expect(dog?.superClass).toBe('Animal');
    expect(dog?.methods.map((m) => m.name)).toEqual(expect.arrayContaining(['species', 'fetch']));
    expect(dog?.properties.map((p) => p.name)).toContain('legs');
    expect(dog?.methods.find((m) => m.name === 'fetch')?.async).toBe(true);
  });

  it('extracts TS interfaces and type aliases', () => {
    const code = `
      /** A cart line item. */
      export interface LineItem { sku: string; qty?: number; }
      export type Id = string;
    `;
    const result = parseFile('types.ts', code);
    const iface = result.interfaces.find((i) => i.name === 'LineItem');
    expect(iface?.kind).toBe('interface');
    expect(iface?.members).toEqual([
      { name: 'sku', type: 'string', optional: false },
      { name: 'qty', type: 'number', optional: true },
    ]);
    expect(result.interfaces.find((i) => i.name === 'Id')?.kind).toBe('type');
  });

  it('records named and default exports', () => {
    const code = `
      export const VERSION = '1.0.0';
      export function helper() {}
      export default function main() {}
    `;
    const result = parseFile('index.ts', code);
    const names = result.exports.map((e) => e.name);
    expect(names).toEqual(expect.arrayContaining(['VERSION', 'helper', 'main']));
    expect(result.exports.some((e) => e.default)).toBe(true);
  });

  it('throws AstParseError with a line number on invalid syntax', () => {
    expect(() => parseFile('bad.ts', 'const = = =;')).toThrow(AstParseError);
  });

  it('collects per-file errors without aborting the batch', () => {
    const { parsed, errors } = parseFiles([
      { name: 'ok.ts', content: 'export const a = 1;' },
      { name: 'broken.ts', content: 'function (' },
    ]);
    expect(parsed).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].fileName).toBe('broken.ts');
  });
});