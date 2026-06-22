'use strict';

const { analyzeCode, parseSource, _internal } = require('../src/services/astParser');
const { describeParam, stringifyType } = _internal;

describe('AST Parser — analyzeCode', () => {
  test('returns empty result for empty input', () => {
    const result = analyzeCode('');
    expect(result.functions).toHaveLength(0);
    expect(result.classes).toHaveLength(0);
    expect(result.exports).toHaveLength(0);
  });

  test('detects a simple function declaration', () => {
    const code = `function greet(name) { return 'Hello ' + name; }`;
    const result = analyzeCode(code);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('greet');
    expect(result.functions[0].params[0].name).toBe('name');
  });

  test('detects an arrow function', () => {
    const code = `const add = (a, b) => a + b;`;
    const result = analyzeCode(code);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('add');
    expect(result.functions[0].kind).toBe('arrow');
  });

  test('detects an async function', () => {
    const code = `async function fetchData(url) { return await fetch(url); }`;
    const result = analyzeCode(code);
    expect(result.functions[0].async).toBe(true);
    expect(result.functions[0].name).toBe('fetchData');
  });

  test('detects a class with methods', () => {
    const code = `
      class Animal {
        constructor(name) {}
        speak() {}
      }
    `;
    const result = analyzeCode(code);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe('Animal');
    expect(result.classes[0].methods).toHaveLength(2);
  });

  test('detects exports', () => {
    const code = `
      export function hello() {}
      export const PI = 3.14;
    `;
    const result = analyzeCode(code);
    expect(result.exports.length).toBeGreaterThanOrEqual(1);
  });

  test('detects TypeScript language', () => {
    const code = `function greet(name: string): void { console.log(name); }`;
    const result = analyzeCode(code);
    expect(result.language).toBe('typescript');
  });

  test('reports correct line count', () => {
    const code = `line1\nline2\nline3`;
    const result = analyzeCode(code);
    expect(result.stats.lineCount).toBe(3);
  });

  test('throws on invalid syntax', () => {
    expect(() => analyzeCode('function (')).toThrow();
  });
});

describe('AST Parser — describeParam', () => {
  test('handles a plain identifier', () => {
    const param = { type: 'Identifier', name: 'userId', optional: false, typeAnnotation: null };
    const result = describeParam(param);
    expect(result.name).toBe('userId');
    expect(result.optional).toBe(false);
  });

  test('handles a rest element', () => {
    const param = {
      type: 'RestElement',
      argument: { name: 'args' },
      typeAnnotation: null,
    };
    const result = describeParam(param);
    expect(result.name).toBe('...args');
  });
});