import { parse } from '@babel/parser';
import _traverse, { type NodePath } from '@babel/traverse';
import type * as t from '@babel/types';
import { parseJsdoc, type ParsedJsdoc } from '../lib/jsdocParser';

const traverse = (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse;

export interface ParsedParam {
  name: string;
  type: string | null;
  optional: boolean;
  properties?: Array<{ name: string; type: string | null; optional: boolean }>;
}

/** Request surface extracted from an Express handler body. */
export interface ExpressHandlerApi {
  /** Fields destructured from req.body. */
  bodyFields: string[];
  /** Path params from req.params.X or const { X } = req.params. */
  routeParams: string[];
  /** Query params from req.query.X or const { X } = req.query. */
  queryParams: string[];
  /** Status codes and response shapes from res.status(N).json({...}). */
  responses: Array<{ status: number; shape: string }>;
}

export interface ParsedFunction {
  name: string;
  params: ParsedParam[];
  returnType: string | null;
  async: boolean;
  exported: boolean;
  doc: string | null;
  jsdoc: ParsedJsdoc | null;
  inlineComments: string[];
  throws: string[];
  line: number | null;
  kind: 'function' | 'arrow' | 'method';
  raw?: string;
  /** Populated when the function signature is (req, res) / (req, res, next). */
  expressApi?: ExpressHandlerApi;
}

export interface ParsedClass {
  name: string;
  superClass: string | null;
  doc: string | null;
  jsdoc: ParsedJsdoc | null;
  line: number | null;
  methods: ParsedFunction[];
  properties: Array<{ name: string; type: string | null; static: boolean }>;
}

export interface ParsedInterface {
  name: string;
  kind: 'interface' | 'type';
  members: Array<{ name: string; type: string | null; optional: boolean }>;
  doc: string | null;
  jsdoc: ParsedJsdoc | null;
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
  envVars: string[];
  raw?: string;
}

export { type ParsedJsdoc } from '../lib/jsdocParser';

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
      if (left.type === 'ObjectPattern') return { ...describeParam(left), optional: true };
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
      return { name: `{ ${properties.map((p) => p.name).join(', ')} }`, type: stringifyType(param.typeAnnotation as t.TSTypeAnnotation), optional: false, properties };
    }
    case 'ArrayPattern':
      return { name: '[…]', type: stringifyType(param.typeAnnotation as t.TSTypeAnnotation), optional: false };
    default:
      return { name: 'param', type: null, optional: false };
  }
}

/**
 * Return the combined raw text of ALL leading comments on a node.
 * Multiple consecutive // line comments are concatenated so that
 * @desc + @route + @access on separate lines are all parsed together.
 * If the closest comment is a block comment (/**...*\/) it takes precedence.
 */
function leadingCommentRaw(node: t.Node): string | null {
  const comments = (node.leadingComments ?? []) as t.Comment[];
  if (comments.length === 0) return null;

  // If the final (closest) comment is a block comment, use it alone.
  const last = comments[comments.length - 1];
  if (last.type === 'CommentBlock') return `/*${last.value}*/`;

  // All are line comments — join them into a single multi-line string so that
  // parseJsdoc can treat them as one unit (e.g. @desc + @route + @access).
  const lineComments = comments.filter((c) => c.type === 'CommentLine');
  if (lineComments.length === 0) return null;
  return lineComments.map((c) => `//${c.value}`).join('\n');
}

function descriptionFromRaw(raw: string | null): string | null {
  if (!raw) return null;
  const jsdoc = parseJsdoc(raw);
  if (jsdoc?.description) return jsdoc.description;
  const cleaned = raw
    .replace(/^\/\*+/, '').replace(/\*+\/$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\/\/\s?/, '').trim())
    .filter((l) => l && !l.startsWith('@'))
    .join(' ')
    .trim();
  return cleaned || null;
}

function extractInlineComments(node: t.Node, allComments: t.Comment[]): string[] {
  if (typeof node.start !== 'number' || typeof node.end !== 'number') return [];
  const leadingRaw = leadingCommentRaw(node);
  const out: string[] = [];
  for (const c of allComments) {
    if (typeof c.start !== 'number') continue;
    if (c.start < node.start || c.end! > node.end) continue;
    const raw = c.value;
    const text = raw.split('\n').map((l) => l.replace(/^\s*\*?\s?/, '').trim()).filter(Boolean).join(' ').trim();
    // Skip if the text is already captured in the leading comment
    if (leadingRaw && leadingRaw.includes(raw.trim())) continue;
    if (text) out.push(text);
  }
  return out;
}

function collectThrows(root: t.Node): string[] {
  const throws = new Set<string>();
  const NESTED_FN_TYPES = new Set([
    'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
    'ClassMethod', 'ObjectMethod',
  ]);

  const visit = (node: unknown, depth = 0): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as t.Node;
    if (depth > 0 && NESTED_FN_TYPES.has(n.type)) return;

    if (n.type === 'ThrowStatement') {
      const arg = (n as t.ThrowStatement).argument;
      let label = 'unknown';
      if (arg) {
        if (arg.type === 'NewExpression') {
          const callee = arg.callee;
          const name = callee.type === 'Identifier' ? callee.name
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier' ? callee.property.name
            : 'Error';
          const firstArg = arg.arguments[0];
          label = firstArg?.type === 'StringLiteral'
            ? `new ${name}(${JSON.stringify(firstArg.value)})`
            : `new ${name}(…)`;
        } else if (arg.type === 'Identifier') {
          label = arg.name;
        } else if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier') {
          label = `${arg.callee.name}(…)`;
        }
      }
      throws.add(label);
    }

    for (const key of Object.keys(n)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      const child = (n as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) { child.forEach((c) => visit(c, depth + 1)); }
      else if (child && typeof child === 'object') visit(child, depth + 1);
    }
  };

  visit(root, 0);
  return [...throws].sort();
}

function collectEnvVars(root: t.Node): string[] {
  const vars = new Set<string>();
  const seen = new Set<unknown>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const n = node as t.Node;
    if (n.type === 'MemberExpression') {
      const me = n as t.MemberExpression;
      if (
        me.object.type === 'MemberExpression' &&
        me.object.object.type === 'Identifier' && me.object.object.name === 'process' &&
        me.object.property.type === 'Identifier' && me.object.property.name === 'env' &&
        me.property.type === 'Identifier'
      ) {
        vars.add(me.property.name);
      }
    }
    for (const key of Object.keys(n)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      const child = (n as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  };
  visit(root);
  return [...vars].sort();
}

/** True when a function signature is (req, res) or (req, res, next) — an Express handler. */
function isExpressHandler(params: ParsedParam[]): boolean {
  if (params.length < 2 || params.length > 3) return false;
  const names = params.map((p) => p.name.toLowerCase());
  return names[0] === 'req' && names[1] === 'res' && (params.length === 2 || names[2] === 'next');
}

/**
 * Extract the real HTTP API surface from an Express handler body:
 *   - req.body fields (from destructuring or direct access)
 *   - req.params / req.query fields
 *   - res.status(N).json({...}) response shapes
 */
function extractExpressApi(body: t.Node, code: string): ExpressHandlerApi {
  const bodyFields = new Set<string>();
  const routeParams = new Set<string>();
  const queryParams = new Set<string>();
  const responseMap = new Map<number, string>();
  const seen = new Set<unknown>();

  const addFromObjectPattern = (pat: t.ObjectPattern, source: 'body' | 'params' | 'query') => {
    for (const prop of pat.properties) {
      if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
        if (source === 'body') bodyFields.add(prop.key.name);
        if (source === 'params') routeParams.add(prop.key.name);
        if (source === 'query') queryParams.add(prop.key.name);
      }
    }
  };

  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { node.forEach(visit); return; }
    const n = node as t.Node;

    // const { a, b } = req.body / req.params / req.query
    if (n.type === 'VariableDeclarator') {
      const vd = n as t.VariableDeclarator;
      if (vd.init?.type === 'MemberExpression') {
        const init = vd.init as t.MemberExpression;
        if (init.object.type === 'Identifier' && init.object.name === 'req' &&
            init.property.type === 'Identifier') {
          const src = init.property.name as 'body' | 'params' | 'query';
          if ((src === 'body' || src === 'params' || src === 'query') &&
              vd.id.type === 'ObjectPattern') {
            addFromObjectPattern(vd.id as t.ObjectPattern, src);
          }
        }
      }
    }

    // req.body.field, req.params.field, req.query.field  (direct access)
    if (n.type === 'MemberExpression') {
      const me = n as t.MemberExpression;
      if (me.object.type === 'MemberExpression' &&
          me.object.object.type === 'Identifier' && me.object.object.name === 'req' &&
          me.object.property.type === 'Identifier' &&
          me.property.type === 'Identifier') {
        const src = me.object.property.name;
        const field = me.property.name;
        if (src === 'body') bodyFields.add(field);
        if (src === 'params') routeParams.add(field);
        if (src === 'query') queryParams.add(field);
      }
    }

    // res.status(N).json({...})
    if (n.type === 'CallExpression') {
      const ce = n as t.CallExpression;
      if (ce.callee.type === 'MemberExpression' &&
          ce.callee.property.type === 'Identifier' && ce.callee.property.name === 'json') {
        const statusCall = ce.callee.object;
        if (statusCall.type === 'CallExpression' &&
            statusCall.callee.type === 'MemberExpression' &&
            statusCall.callee.property.type === 'Identifier' &&
            statusCall.callee.property.name === 'status' &&
            statusCall.callee.object.type === 'Identifier' &&
            statusCall.callee.object.name === 'res') {
          const statusArg = statusCall.arguments[0];
          const status = statusArg?.type === 'NumericLiteral' ? statusArg.value : 200;
          const jsonArg = ce.arguments[0];
          let shape = '';
          if (jsonArg && typeof jsonArg.start === 'number' && typeof jsonArg.end === 'number') {
            shape = code.slice(jsonArg.start, jsonArg.end).replace(/\s+/g, ' ').slice(0, 120);
          }
          // Deduplicate: keep first shape seen for each status code
          if (!responseMap.has(status)) responseMap.set(status, shape);
        }

        // res.json({...}) without explicit status → 200
        if (ce.callee.object.type === 'Identifier' && ce.callee.object.name === 'res') {
          if (!responseMap.has(200)) {
            const jsonArg = ce.arguments[0];
            let shape = '';
            if (jsonArg && typeof jsonArg.start === 'number' && typeof jsonArg.end === 'number') {
              shape = code.slice(jsonArg.start, jsonArg.end).replace(/\s+/g, ' ').slice(0, 120);
            }
            responseMap.set(200, shape);
          }
        }
      }
    }

    for (const key of Object.keys(n)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      const child = (n as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  };

  visit(body);

  return {
    bodyFields: [...bodyFields],
    routeParams: [...routeParams],
    queryParams: [...queryParams],
    responses: [...responseMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([status, shape]) => ({ status, shape })),
  };
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
      attachComment: true,
      plugins: isTs ? ['typescript', ...PLUGINS] : [...PLUGINS],
    });
  } catch (err) {
    const e = err as { message: string; loc?: { line: number } };
    throw new AstParseError(fileName, e.message, e.loc?.line ?? null);
  }

  const allComments: t.Comment[] = ast.comments ?? [];
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

  function buildFunction(
    name: string,
    params: t.Node[],
    returnType: t.TSTypeAnnotation | null | undefined,
    async: boolean,
    exported: boolean,
    commentNode: t.Node,
    bodyNode: t.Node,
    kind: ParsedFunction['kind'],
    rawNode?: t.Node,
  ): ParsedFunction {
    const raw = leadingCommentRaw(commentNode);
    const jsdoc = parseJsdoc(raw);
    const parsedParams = params.map(describeParam);
    const fn: ParsedFunction = {
      name,
      params: parsedParams,
      returnType: stringifyType(returnType),
      async,
      exported,
      doc: jsdoc?.description ?? descriptionFromRaw(raw),
      jsdoc,
      inlineComments: extractInlineComments(bodyNode, allComments),
      throws: collectThrows(bodyNode),
      line: lineOf(bodyNode),
      kind,
      raw: rawNode ? snippet(code, rawNode) : snippet(code, bodyNode),
    };
    if (isExpressHandler(parsedParams)) {
      fn.expressApi = extractExpressApi(bodyNode, code);
    }
    return fn;
  }

  /** Add a CommonJS-exported function to the functions/exports lists. */
  function addCjsExport(
    name: string,
    fn: t.ArrowFunctionExpression | t.FunctionExpression,
    commentNode: t.Node,
  ): void {
    functions.push(buildFunction(
      name,
      fn.params,
      (fn as t.ArrowFunctionExpression).returnType as t.TSTypeAnnotation,
      fn.async,
      true,
      commentNode,
      fn,
      fn.type === 'ArrowFunctionExpression' ? 'arrow' : 'function',
    ));
    if (!exportedNames.has(name)) {
      exports.push({ name, kind: 'variable', default: false });
      exportedNames.add(name);
    }
  }

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
      const commentNode = path.parent.type === 'ExportNamedDeclaration' ? path.parent : path.node;
      functions.push(buildFunction(
        path.node.id.name,
        path.node.params,
        path.node.returnType as t.TSTypeAnnotation,
        path.node.async,
        exported,
        commentNode,
        path.node,
        'function',
      ));
    },

    VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
      const init = path.node.init;
      if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') && path.node.id.type === 'Identifier') {
        const decl = path.findParent((p) => p.isVariableDeclaration());
        const commentNode = decl?.parent.type === 'ExportNamedDeclaration' ? decl.parent : (decl?.node ?? init);
        functions.push(buildFunction(
          path.node.id.name,
          init.params,
          init.returnType as t.TSTypeAnnotation,
          init.async,
          decl?.parent.type === 'ExportNamedDeclaration',
          commentNode,
          init,
          init.type === 'ArrowFunctionExpression' ? 'arrow' : 'function',
          decl?.node,
        ));
      }
    },

    // ── CommonJS exports ─────────────────────────────────────────────────────
    // Handles: exports.NAME = fn, module.exports.NAME = fn, module.exports = { ... }
    // Also handles wrapped patterns: exports.NAME = asyncHandler(fn), etc.
    AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
      // Only process direct children of the Program (top-level statements)
      if (path.parent.type !== 'ExpressionStatement') return;
      const stmtPath = path.parentPath;
      if (!stmtPath || stmtPath.parent.type !== 'Program') return;

      const { left, right } = path.node;

      /**
       * Extract a function node from a value that may be:
       *   - directly a function/arrow expression, OR
       *   - a call-expression wrapping a function (e.g. asyncHandler(async (req,res)=>{}) )
       */
      function unwrapFn(node: t.Expression): t.ArrowFunctionExpression | t.FunctionExpression | null {
        if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
          return node;
        }
        if (node.type === 'CallExpression') {
          for (const arg of node.arguments) {
            if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
              return arg;
            }
          }
        }
        return null;
      }

      // Pattern A: exports.NAME = fn   OR   exports.NAME = wrapper(fn)
      if (
        left.type === 'MemberExpression' &&
        left.object.type === 'Identifier' && left.object.name === 'exports' &&
        left.property.type === 'Identifier'
      ) {
        const fn = unwrapFn(right as t.Expression);
        if (fn) {
          addCjsExport(left.property.name, fn, path.parent);
          return;
        }
      }

      // Pattern B: module.exports.NAME = fn   OR   module.exports.NAME = wrapper(fn)
      if (
        left.type === 'MemberExpression' &&
        left.object.type === 'MemberExpression' &&
        left.object.object.type === 'Identifier' && left.object.object.name === 'module' &&
        left.object.property.type === 'Identifier' && left.object.property.name === 'exports' &&
        left.property.type === 'Identifier'
      ) {
        const fn = unwrapFn(right as t.Expression);
        if (fn) {
          addCjsExport(left.property.name, fn, path.parent);
          return;
        }
      }

      // Pattern C: module.exports = { NAME: fn, ... }
      if (
        left.type === 'MemberExpression' &&
        left.object.type === 'Identifier' && left.object.name === 'module' &&
        left.property.type === 'Identifier' && left.property.name === 'exports' &&
        right.type === 'ObjectExpression'
      ) {
        for (const prop of (right as t.ObjectExpression).properties) {
          if (prop.type !== 'ObjectProperty' || prop.key.type !== 'Identifier') continue;
          const propName = prop.key.name;
          const fn = unwrapFn(prop.value as t.Expression);
          if (fn) {
            addCjsExport(propName, fn, prop);
          } else if ((prop.value as t.Node).type === 'Identifier') {
            if (!exportedNames.has(propName)) {
              exports.push({ name: propName, kind: 'reference', default: false });
              exportedNames.add(propName);
            }
          }
        }
        return;
      }
    },

    ClassDeclaration(path: NodePath<t.ClassDeclaration>) {
      if (!path.node.id) return;
      const methods: ParsedFunction[] = [];
      const properties: ParsedClass['properties'] = [];
      for (const member of path.node.body.body) {
        if (member.type === 'ClassMethod' && member.key.type === 'Identifier') {
          const raw = leadingCommentRaw(member);
          const jsdoc = parseJsdoc(raw);
          const parsedParams = member.params.map(describeParam);
          const m: ParsedFunction = {
            name: member.key.name,
            params: parsedParams,
            returnType: stringifyType(member.returnType as t.TSTypeAnnotation),
            async: member.async,
            exported: false,
            doc: jsdoc?.description ?? descriptionFromRaw(raw),
            jsdoc,
            inlineComments: extractInlineComments(member, allComments),
            throws: collectThrows(member),
            line: lineOf(member),
            kind: 'method',
          };
          if (isExpressHandler(parsedParams)) m.expressApi = extractExpressApi(member, code);
          methods.push(m);
        } else if (member.type === 'ClassProperty' && member.key.type === 'Identifier') {
          properties.push({ name: member.key.name, type: stringifyType(member.typeAnnotation as t.TSTypeAnnotation), static: Boolean(member.static) });
        }
      }
      const commentNode = path.parent.type === 'ExportNamedDeclaration' ? path.parent : path.node;
      const raw = leadingCommentRaw(commentNode);
      classes.push({
        name: path.node.id.name,
        superClass: path.node.superClass?.type === 'Identifier' ? path.node.superClass.name : null,
        doc: descriptionFromRaw(raw),
        jsdoc: parseJsdoc(raw),
        line: lineOf(path.node),
        methods,
        properties,
      });
    },

    TSInterfaceDeclaration(path: NodePath<t.TSInterfaceDeclaration>) {
      const commentNode = path.parent.type === 'ExportNamedDeclaration' ? path.parent : path.node;
      const raw = leadingCommentRaw(commentNode);
      interfaces.push({
        name: path.node.id.name,
        kind: 'interface',
        members: path.node.body.body.map((m) => {
          if (m.type === 'TSPropertySignature' && m.key.type === 'Identifier') {
            return { name: m.key.name, type: stringifyType(m.typeAnnotation as t.TSTypeAnnotation), optional: Boolean(m.optional) };
          }
          return { name: 'member', type: null, optional: false };
        }),
        doc: descriptionFromRaw(raw),
        jsdoc: parseJsdoc(raw),
        line: lineOf(path.node),
      });
    },

    TSTypeAliasDeclaration(path: NodePath<t.TSTypeAliasDeclaration>) {
      const commentNode = path.parent.type === 'ExportNamedDeclaration' ? path.parent : path.node;
      const raw = leadingCommentRaw(commentNode);
      interfaces.push({ name: path.node.id.name, kind: 'type', members: [], doc: descriptionFromRaw(raw), jsdoc: parseJsdoc(raw), line: lineOf(path.node) });
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

  for (const c of allComments) {
    const text = c.value.replace(/^\*/, '').split('\n').map((l) => l.replace(/^\s*\*?\s?/, '').trim()).filter(Boolean).join(' ').trim();
    if (text) comments.push(text);
  }

  for (const fn of functions) if (exportedNames.has(fn.name)) fn.exported = true;

  const react: ReactFacts = {
    isReact: jsxElements.size > 0 || hooks.length > 0,
    hooks,
    jsxElements: [...jsxElements],
    eventHandlers: [...eventHandlers],
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
    envVars: collectEnvVars(ast.program),
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
