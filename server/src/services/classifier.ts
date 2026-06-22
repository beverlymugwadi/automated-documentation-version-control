import type { ParsedFile } from './astParser';

export type Role =
  | 'next-error-boundary'
  | 'next-page'
  | 'next-layout'
  | 'next-route-handler'
  | 'api-endpoint'
  | 'react-component'
  | 'react-hook'
  | 'util'
  | 'types'
  | 'module';

export interface Classification {
  role: Role;
  label: string;
  signals: string[];
}

const LABELS: Record<Role, string> = {
  'next-error-boundary': 'Next.js Error Boundary',
  'next-page': 'Next.js Page',
  'next-layout': 'Next.js Layout',
  'next-route-handler': 'Next.js Route Handler',
  'api-endpoint': 'API Endpoint',
  'react-component': 'React Component',
  'react-hook': 'React Hook',
  util: 'Utility Module',
  types: 'Type Definitions',
  module: 'Module',
};

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const base = (fileName: string): string => fileName.split('/').pop() ?? fileName;

function hasProps(file: ParsedFile, names: string[]): boolean {
  return file.functions.some((fn) =>
    fn.params.some((p) => p.properties && names.every((n) => p.properties!.some((pp) => pp.name === n))),
  );
}

export function classifyFile(file: ParsedFile): Classification {
  const name = base(file.fileName).toLowerCase();
  const signals: string[] = [];
  const exportedHttp = file.exports.filter((e) => HTTP_METHODS.includes(e.name)).map((e) => e.name);

  if (file.directives.includes('use client')) signals.push('"use client" directive');
  if (file.directives.includes('use server')) signals.push('"use server" directive');

  if (/^error\.(t|j)sx?$/.test(name) && hasProps(file, ['error', 'reset'])) {
    signals.push('error.tsx filename', '{ error, reset } props');
    return { role: 'next-error-boundary', label: LABELS['next-error-boundary'], signals };
  }

  if (/^route\.(t|j)sx?$/.test(name) && exportedHttp.length) {
    signals.push('route.ts filename', `exports ${exportedHttp.join(', ')}`);
    return { role: 'next-route-handler', label: LABELS['next-route-handler'], signals };
  }
  if (exportedHttp.length) {
    signals.push(`exports HTTP methods: ${exportedHttp.join(', ')}`);
    return { role: 'api-endpoint', label: LABELS['api-endpoint'], signals };
  }

  if (/^page\.(t|j)sx?$/.test(name)) {
    signals.push('page.tsx filename');
    return { role: 'next-page', label: LABELS['next-page'], signals };
  }
  if (/^layout\.(t|j)sx?$/.test(name)) {
    signals.push('layout.tsx filename');
    return { role: 'next-layout', label: LABELS['next-layout'], signals };
  }

  const hookExport = file.functions.find((fn) => fn.exported && /^use[A-Z]/.test(fn.name));
  if (hookExport) {
    signals.push(`exports hook ${hookExport.name}`, ...(file.react.hooks.length ? [`calls ${file.react.hooks.map((h) => h.name).join(', ')}`] : []));
    return { role: 'react-hook', label: LABELS['react-hook'], signals };
  }

  const pascalExport = file.functions.find((fn) => fn.exported && /^[A-Z]/.test(fn.name));
  if (file.react.jsxElements.length > 0 || (pascalExport && file.react.isReact)) {
    signals.push('renders JSX', ...(file.react.jsxElements.length ? [`elements: ${file.react.jsxElements.slice(0, 5).join(', ')}`] : []));
    return { role: 'react-component', label: LABELS['react-component'], signals };
  }

  if (file.functions.length === 0 && file.classes.length === 0 && file.interfaces.length > 0) {
    signals.push('only interfaces/types exported');
    return { role: 'types', label: LABELS.types, signals };
  }

  if (file.functions.length > 0 || file.classes.length > 0) {
    signals.push('exports functions/classes, no JSX');
    return { role: 'util', label: LABELS.util, signals };
  }

  signals.push('no recognised signals');
  return { role: 'module', label: LABELS.module, signals };
}