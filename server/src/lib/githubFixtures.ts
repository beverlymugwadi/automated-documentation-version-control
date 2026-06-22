export interface GhRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  updatedAt: string;
  private: boolean;
  stargazers: number;
}

export interface GhTreeNode {
  path: string;
  type: 'file' | 'dir';
  documentable: boolean;
}

export const MOCK_REPOS: GhRepo[] = [
  {
    id: 1,
    name: 'checkout-service',
    fullName: 'ada/checkout-service',
    description: 'Cart, pricing and currency utilities for the storefront.',
    language: 'TypeScript',
    defaultBranch: 'main',
    updatedAt: '2026-06-11T09:24:00.000Z',
    private: false,
    stargazers: 128,
  },
  {
    id: 2,
    name: 'auth-gateway',
    fullName: 'ada/auth-gateway',
    description: 'JWT issuing and session validation service.',
    language: 'TypeScript',
    defaultBranch: 'main',
    updatedAt: '2026-05-30T14:02:00.000Z',
    private: true,
    stargazers: 42,
  },
  {
    id: 3,
    name: 'ui-kit',
    fullName: 'ada/ui-kit',
    description: 'Design-system primitives shared across products.',
    language: 'JavaScript',
    defaultBranch: 'main',
    updatedAt: '2026-06-02T18:41:00.000Z',
    private: false,
    stargazers: 311,
  },
  {
    id: 4,
    name: 'data-pipeline',
    fullName: 'ada/data-pipeline',
    description: 'ETL jobs and schedulers. Mostly Python with a TS control plane.',
    language: 'Python',
    defaultBranch: 'develop',
    updatedAt: '2026-04-18T07:15:00.000Z',
    private: false,
    stargazers: 76,
  },
];

const TREES: Record<string, GhTreeNode[]> = {
  'ada/checkout-service': [
    { path: 'src', type: 'dir', documentable: false },
    { path: 'src/cart.ts', type: 'file', documentable: true },
    { path: 'src/pricing.ts', type: 'file', documentable: true },
    { path: 'src/currency.ts', type: 'file', documentable: true },
    { path: 'src/index.ts', type: 'file', documentable: true },
    { path: 'tests', type: 'dir', documentable: false },
    { path: 'tests/cart.test.ts', type: 'file', documentable: true },
    { path: 'README.md', type: 'file', documentable: true },
    { path: 'package.json', type: 'file', documentable: false },
  ],
  'ada/auth-gateway': [
    { path: 'src/jwt.ts', type: 'file', documentable: true },
    { path: 'src/middleware.ts', type: 'file', documentable: true },
    { path: 'README.md', type: 'file', documentable: true },
  ],
  'ada/ui-kit': [
    { path: 'src/Button.jsx', type: 'file', documentable: true },
    { path: 'src/Input.jsx', type: 'file', documentable: true },
    { path: 'README.md', type: 'file', documentable: true },
  ],
};

export function mockTree(fullName: string): GhTreeNode[] {
  return TREES[fullName] ?? [{ path: 'README.md', type: 'file', documentable: true }];
}

const SAMPLE_FILES: Record<string, string> = {
  'src/pricing.ts': `/**
 * Pricing utilities for the checkout flow.
 */

export interface LineItem {
  sku: string;
  unitPrice: number;
  quantity: number;
}

export function subtotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function applyDiscount(amount: number, percent: number): number {
  const pct = Math.min(Math.max(percent, 0), 100);
  return Math.round(amount * (1 - pct / 100));
}
`,
  'src/cart.ts': `import { LineItem, subtotal } from './pricing';

export class Cart {
  private items: LineItem[] = [];

  add(item: LineItem): number {
    this.items.push(item);
    return this.items.length;
  }

  total(): number {
    return subtotal(this.items);
  }
}
`,
  'src/currency.ts': `export function formatPrice(minorUnits: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    minorUnits / 100,
  );
}
`,
};

export function mockFile(path: string): string {
  return (
    SAMPLE_FILES[path] ??
    `// ${path}\n// (mock content) This file is part of the demo repository.\nexport const placeholder = true;\n`
  );
}