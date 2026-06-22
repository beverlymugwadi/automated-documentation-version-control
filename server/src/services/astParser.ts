import { parse } from '@babel/parser';
import _traverse, { type NodePath } from '@babel/traverse';
import type * as t from '@babel/types';

// @babel/traverse ships a CJS/ESM interop default — normalise it.
const traverse = (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse;

export interface ParsedParam {
  name: string;
  type: string | null;
  optional: boolean;
  properties?: Array<{ name: string; type: string | null; optional: boolean }>;
}

export interface ParsedFunction {
  name: string;
  params: ParsedParam[];
  returnType: string | null;
  async: boolean;
  exported: boolean;
  doc: string | null;
  line: number | null;
  kind: 'function' | 'arrow' | 'method';
  raw?: string;
}

export interface ParsedClass {
  name: string;
  superClass: string | null;
  doc: string | null;
  line: number | null;
  methods: ParsedFunction[];
  properties: Array<{ name: string; type: string | null; static: boolean }>;
}

export interface ParsedInterface {
  name: string;
  kind: 'interface' | 'type';
  members: Array<{ name: string; type: string | null; optional: boolean }>;
  doc: string | null;
  line: number | null;
}

export interface ParsedExport {
  name: string;
  kind: string;
  default: boolean;
}

export interface ImportGroup {
  source: string;
  default?: string;
  namespace?: string;
  named: string[];
}

export interface ReactFacts {
  isReact: boolean;
  hooks: Array<{ name: string; args: string[] }>;
  jsxElements: string[];
  eventHandlers: Array<{ event: string; calls: string[] }>;
}

export interface ParsedFile {
  fileName: string;
  language: 'javascript' | 'typescript';
  directives: string[];
  functions: ParsedFunction[];
  classes: ParsedClass[];
  interfaces: ParsedInterface[];
  exports: ParsedExport[];
  imports: ImportGroup[];
  comments: string[];
  react: ReactFacts;
  raw?: string;
}

export class AstParseError extends Error {
  fileName: string;
  line: number | null;
  constructor(fileName: string, message: string, line: number | null) {
    super(`Failed to parse ${fileName}: ${message}${line ? ` (line ${line})` : ''}`);
    this.name = 'AstParseError';
    this.fileName = fileName;
    this.line = line;
  }
}

const PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'topLevelAwait',
] as const;

const RAW_CAP = 1200;
const ARG_CAP = 60;

function snippet(code: string, node: t.Node | null | undefined, cap = RAW_CAP): string | undefined {
  if (!node || typeof node.start !== 'number' || typeof node.end !== 'number') return undefined;
  const text = code.slice(node.start, node.end);
  return text.length > cap ? `${text.slice(0, cap)}…` : text;
}

function stringifyType(node: t.TSType | t.TSTypeAnnotation | null | undefined): string | null {
  if (!node) return null;
  const ts = (node as t.TSTypeAnnotation).typeAnnotation ?? (node as t.TSType);
  if (!ts) return null;
  switch (ts.type) {
    case 'TSStringKeyword': return 'string';
    case 'TSNumberKeyword': return 'number';
    case 'TSBooleanKeyword': return 'boolean';
    case 'TSVoidKeyword': return 'void';
    case 'TSAnyKeyword': return 'any';
    case 'TSUnknownKeyword': return 'unknown';
    case 'TSNullKeyword': return 'null';
    case 'TSUndefinedKeyword': return 'undefined';
    case 'TSObjectKeyword': return 'object';
    case 'TSNeverKeyword': return 'never';
    case 'TSArrayType': return `${stringifyType(ts.elementType) ?? 'unknown'}[]`;
    case 'TSUnionType': return ts.types.map((x) => stringifyType(x)).join(' | ');
    case 'TSIntersectionType': return ts.types.map((x) => stringifyType(x)).join(' & ');
    case 'TSTypeReference':
      return ts.typeName.type === 'Identifier' ? ts.typeName.name : 'ref';
    case 'TSLiteralType':
      return 'value' in ts.literal ? JSON.stringify((ts.literal as { value: unknown }).value) : 'literal';
    case 'TSFunctionType': return 'function';
    case 'TSTypeLiteral': return '{ … }';
    default:
      return ts.type.replace(/^TS/, '').replace(/Keyword$/, '').toLowerCase();
  }
}

function typeLiteralMembers(annotation: t.Node | null | undefined): Map<string, { type: string | null; optional: boolean }> {
  const out = new Map<string, { type: string | null; optional: boolean }>();
  const ts = (annotation as t.TSTypeAnnotation | undefined)?.typeAnnotation;
  if (ts && ts.type === 'TSTypeLiteral') {
    for (const m of ts.members) {
      if (m.type === 'TSPropertySignature' && m.key.type === 'Identifier') {
        out.set(m.key.name, { type: stringifyType(m.typeAnnotation as t.TSTypeAnnotation), optional: Boolean(m.optional) });
      }
    }
  }
  return out;
}

function describeParam(param: t.Node): ParsedParam {
  switch (param.type) {
    case 'Identifier':
      return { name: param.name, type: stringifyType(param.typeAnnotation as t.TSTypeAnnotation), optional: Boolean(param.optional) };
    case 'AssignmentPattern': {
      const left = param.left;
      if (left.type === 'ObjectPattern') {
        const inner = describeParam(left);
        return { ...inner, optional: true };
      }
      return { name: left.type === 'Identifier' ? left.name : 'param', type: stringifyType((left as t.Identifier).typeAnnotation as t.TSTypeAnnotation), optional: true };
    }
    case 'RestElement':
      return { name: `...${param.argument.type === 'Identifier' ? param.argument.name : 'args'}`, type: stringifyType(param.typeAnnotation as t.TSTypeAnnotation), optional: false };
    case 'ObjectPattern': {
      const members = typeLiteralMembers(param.typeAnnotation);
      const properties: NonNullable<ParsedParam['properties']> = [];
      for (const prop of param.properties) {
        if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
          const meta = members.get(prop.key.name);
          properties.push({ name: prop.key.name, type: meta?.type ?? null, optional: meta?.optional ?? false });
        } else if (prop.type === 'RestElement' && prop.argument.type === 'Identifier') {
          properties.push({ name: `...${prop.argument.name}`, type: null, optional: false });
        }
      }
      const name = `{ ${properties.map((p) => p.name).join(', ')} }`;
      return { name, type: stringifyType(param.typeAnnotation as t.TSTypeAnnotation), optional: false, properties };
    }
    case 'ArrayPattern':
      return { name: '[…]', type: stringifyType(param.typeAnnotation as t.TSTypeAnnotation), optional: false };
    default:
      return { name: 'param', type: null, optional: false };
  }
}

function leadingDoc(node: t.Node): string | null {
  const comments = (node.leadingComments ?? []) as t.Comment[];
  if (comments.length === 0) return null;
  const raw = comments[comments.length - 1].value;
  const cleaned = raw
    .split('\n')
    .map((l) => l.replace(/^\s*\*?\s?/, '').trim())
    .filter((l) => l && !l.startsWith('@'))
    .join(' ')
    .trim();
  return cleaned || null;
}

const lineOf = (node: t.Node): number | null => node.loc?.start.line ?? null;

function jsxName(node: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string {
  if (node.type === 'JSXIdentifier') return node.name;
  if (node.type === 'JSXMemberExpression') return `${jsxName(node.object)}.${node.property.name}`;
  return `${node.namespace.name}:${node.name.name}`;
}

function collectCalls(root: t.Node): string[] {
  const calls = new Set<string>();
  const seen = new Set<unknown>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const n = node as t.Node;
    if (n.type === 'CallExpression') {
      const callee = n.callee;
      if (callee.type === 'Identifier') calls.add(callee.name);
      else if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const obj = callee.object.type === 'Identifier' ? `${callee.object.name}.` : '';
        calls.add(`${obj}${callee.property.name}`);
      }
    }
    for (const key of Object.keys(n)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      visit((n as unknown as Record<string, unknown>)[key]);
    }
  };
  visit(root);
  return [...calls];
}

export function parseFile(fileName: string, code: string): ParsedFile {
  const isTs = /\.tsx?$/.test(fileName) || /:\s*\w|interface\s+\w|<[A-Z]\w*>/.test(code);

  let ast: t.File;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: isTs ? ['typescript', ...PLUGINS] : [...PLUGINS],
    });
  } catch (err) {
    const e = err as { message: string; loc?: { line: number } };
    throw new AstParseError(fileName, e.message, e.loc?.line ?? null);
  }

  const functions: ParsedFunction[] = [];
  const classes: ParsedClass[] = [];
  const interfaces: ParsedInterface[] = [];
  const exports: ParsedExport[] = [];
  const imports: ImportGroup[] = [];
  const comments: string[] = [];
  const exportedNames = new Set<string>();

  const hooks: ReactFacts['hooks'] = [];
  const jsxElements = new Set<string>();
  const eventHandlers: ReactFacts['eventHandlers'] = [];

  const directives = (ast.program.directives ?? []).map((d) => d.value.value);

  traverse(ast, {
    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
      const group: ImportGroup = { source: path.node.source.value, named: [] };
      for (const spec of path.node.specifiers) {
        if (spec.type === 'ImportDefaultSpecifier') group.default = spec.local.name;
        else if (spec.type === 'ImportNamespaceSpecifier') group.namespace = spec.local.name;
        else if (spec.type === 'ImportSpecifier') {
          group.named.push(spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value);
        }
      }
      imports.push(group);
    },

    CallExpression(path: NodePath<t.CallExpression>) {
      const callee = path.node.callee;
      if (callee.type === 'Identifier' && /^use[A-Z]/.test(callee.name)) {
        hooks.push({
          name: callee.name,
          args: path.node.arguments.map((a) => snippet(code, a, ARG_CAP) ?? '').filter(Boolean),
        });
      }
    },

    JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
      jsxElements.add(jsxName(path.node.name));
    },

    JSXAttribute(path: NodePath<t.JSXAttribute>) {
      const nameNode = path.node.name;
      const attr = nameNode.type === 'JSXIdentifier' ? nameNode.name : '';
      if (/^on[A-Z]/.test(attr) && path.node.value && path.node.value.type === 'JSXExpressionContainer') {
        const expr = path.node.value.expression;
        let calls: string[] = [];
        if (expr.type === 'Identifier') calls = [expr.name];
        else if (expr.type !== 'JSXEmptyExpression') calls = collectCalls(expr as t.Node);
        eventHandlers.push({ event: attr, calls });
      }
    },

    FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
      if (!path.node.id) return;
      const exported = path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration';
      functions.push({
        name: path.node.id.name,
        params: path.node.params.map(describeParam),
        returnType: stringifyType(path.node.returnType as t.TSTypeAnnotation),
        async: path.node.async,
        exported,
        doc: leadingDoc(path.node) ?? leadingDoc(path.parent),
        line: lineOf(path.node),
        kind: 'function',
        raw: snippet(code, path.node),
      });
    },

    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      const init = path.node.init;
      if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') && path.node.id.type === 'Identifier') {
        const decl = path.findParent((p) => p.isVariableDeclaration());
        functions.push({
          name: path.node.id.name,
          params: init.params.map(describeParam),
          returnType: stringifyType(init.returnType as t.TSTypeAnnotation),
          async: init.async,
          exported: decl?.parent.type === 'ExportNamedDeclaration',
          doc: leadingDoc(decl?.node ?? init),
          line: lineOf(init),
          kind: init.type === 'ArrowFunctionExpression' ? 'arrow' : 'function',
          raw: snippet(code, decl?.node ?? init),
        });
      }
    },

    ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
      if (!path.node.id) return;
      const methods: ParsedFunction[] = [];
      const properties: ParsedClass['properties'] = [];
      for (const member of path.node.body.body) {
        if (member.type === 'ClassMethod' && member.key.type === 'Identifier') {
          methods.push({
            name: member.key.name,
            params: member.params.map(describeParam),
            returnType: stringifyType(member.returnType as t.TSTypeAnnotation),
            async: member.async,
            exported: false,
            doc: leadingDoc(member),
            line: lineOf(member),
            kind: 'method',
          });
        } else if (member.type === 'ClassProperty' && member.key.type === 'Identifier') {
          properties.push({
            name: member.key.name,
            type: stringifyType(member.typeAnnotation as t.TSTypeAnnotation),
            static: Boolean(member.static),
          });
        }
      }
      classes.push({
        name: path.node.id.name,
        superClass: path.node.superClass && path.node.superClass.type === 'Identifier' ? path.node.superClass.name : null,
        doc: leadingDoc(path.node) ?? leadingDoc(path.parent),
        line: lineOf(path.node),
        methods,
        properties,
      });
    },

    TSInterfaceDeclaration(path: NodePath<t.TSInterfaceDeclaration>) {
      interfaces.push({
        name: path.node.id.name,
        kind: 'interface',
        members: path.node.body.body.map((m) => {
          if (m.type === 'TSPropertySignature' && m.key.type === 'Identifier') {
            return { name: m.key.name, type: stringifyType(m.typeAnnotation as t.TSTypeAnnotation), optional: Boolean(m.optional) };
          }
          return { name: 'member', type: null, optional: false };
        }),
        doc: leadingDoc(path.node) ?? leadingDoc(path.parent),
        line: lineOf(path.node),
      });
    },

    TSTypeAliasDeclaration(path: NodePath<t.TSTypeAliasDeclaration>) {
      interfaces.push({
        name: path.node.id.name,
        kind: 'type',
        members: [],
        doc: leadingDoc(path.node) ?? leadingDoc(path.parent),
        line: lineOf(path.node),
      });
    },

    ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
      const decl = path.node.declaration;
      if (decl) {
        if ((decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') && decl.id) {
          exports.push({ name: decl.id.name, kind: decl.type === 'FunctionDeclaration' ? 'function' : 'class', default: false });
          exportedNames.add(decl.id.name);
        } else if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id.type === 'Identifier') {
              exports.push({ name: d.id.name, kind: 'variable', default: false });
              exportedNames.add(d.id.name);
            }
          }
        } else if (decl.type === 'TSInterfaceDeclaration' || decl.type === 'TSTypeAliasDeclaration') {
          exports.push({ name: decl.id.name, kind: decl.type === 'TSInterfaceDeclaration' ? 'interface' : 'type', default: false });
        }
      }
      for (const spec of path.node.specifiers) {
        if (spec.type === 'ExportSpecifier') {
          const name = spec.exported.type === 'Identifier' ? spec.exported.name : spec.exported.value;
          exports.push({ name, kind: 'reference', default: false });
          exportedNames.add(name);
        }
      }
    },

    ExportDefaultDeclaration(path: NodePath<t.ExportDefaultDeclaration>) {
      const decl = path.node.declaration;
      const name = ('id' in decl && decl.id?.type === 'Identifier' && decl.id.name) || (decl.type === 'Identifier' && decl.name) || 'default';
      exports.push({ name, kind: decl.type, default: true });
    },
  });

  for (const c of ast.comments ?? []) {
    const text = c.value.replace(/^\*/, '').split('\n').map((l) => l.replace(/^\s*\*?\s?/, '').trim()).filter(Boolean).join(' ').trim();
    if (text) comments.push(text);
  }

  for (const fn of functions) if (exportedNames.has(fn.name)) fn.exported = true;

  const react: ReactFacts = {
    isReact: jsxElements.size > 0 || hooks.length > 0,
    hooks,
    jsxElements: [...jsxElements],
    eventHandlers,
  };

  const sparse = functions.length === 0 && classes.length === 0 && interfaces.length === 0;

  return {
    fileName,
    language: isTs ? 'typescript' : 'javascript',
    directives,
    functions: functions.sort((a, b) => (a.line ?? 0) - (b.line ?? 0)),
    classes,
    interfaces,
    exports,
    imports,
    comments,
    react,
    raw: sparse ? snippet(code, ast.program, 4000) ?? code.slice(0, 4000) : undefined,
  };
}

export function parseFiles(files: Array<{ name: string; content: string }>): {
  parsed: ParsedFile[];
  errors: Array<{ fileName: string; message: string; line: number | null }>;
} {
  const parsed: ParsedFile[] = [];
  const errors: Array<{ fileName: string; message: string; line: number | null }> = [];
  for (const f of files) {
    try {
      parsed.push(parseFile(f.name, f.content));
    } catch (err) {
      if (err instanceof AstParseError) {
        errors.push({ fileName: err.fileName, message: err.message, line: err.line });
      } else {
        errors.push({ fileName: f.name, message: (err as Error).message, line: null });
      }
    }
  }
  return { parsed, errors };
}