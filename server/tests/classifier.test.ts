import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/services/astParser';
import { classifyFile } from '../src/services/classifier';

const roleOf = (name: string, code: string) => classifyFile(parseFile(name, code)).role;

describe('classifier', () => {
  it('tags a Next.js error boundary (error.tsx + {error, reset})', () => {
    const code = `'use client';
      export default function Error({ error, reset }: { error: Error; reset: () => void }) {
        return <button onClick={reset}>Retry</button>;
      }`;
    expect(roleOf('app/error.tsx', code)).toBe('next-error-boundary');
  });

  it('tags a Next.js route handler (route.ts exporting verbs)', () => {
    const code = `export async function GET() { return Response.json({ ok: true }); }
      export async function POST() { return Response.json({ ok: true }); }`;
    expect(roleOf('app/api/users/route.ts', code)).toBe('next-route-handler');
  });

  it('tags a bare API endpoint (HTTP verb exports, non-route filename)', () => {
    expect(roleOf('handlers.ts', `export function DELETE() {}`)).toBe('api-endpoint');
  });

  it('tags a React component (renders JSX)', () => {
    const code = `export function Card() { return <div className="card">hi</div>; }`;
    expect(roleOf('Card.tsx', code)).toBe('react-component');
  });

  it('tags a React hook (exported use* calling hooks)', () => {
    const code = `import { useState } from 'react';
      export function useToggle() { const [on, set] = useState(false); return [on, set]; }`;
    expect(roleOf('useToggle.ts', code)).toBe('react-hook');
  });

  it('tags a page and a layout by filename', () => {
    expect(roleOf('app/page.tsx', `export default function Page() { return <main/>; }`)).toBe('next-page');
    expect(roleOf('app/layout.tsx', `export default function Layout() { return <html/>; }`)).toBe('next-layout');
  });

  it('tags a plain utility module', () => {
    expect(roleOf('math.ts', `export function add(a: number, b: number) { return a + b; }`)).toBe('util');
  });

  it('tags a types-only module', () => {
    expect(roleOf('types.ts', `export interface User { id: string; }`)).toBe('types');
  });
});