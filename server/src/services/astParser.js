'use strict';

const { parse } = require('@babel/parser');
const traverseModule = require('@babel/traverse');

const traverse = traverseModule.default || traverseModule;

const PARSER_PLUGINS = [
  'typescript',
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'dynamicImport',
  'topLevelAwait',
  'exportDefaultFrom',
];

function stringifyType(typeAnnotation) {
  if (!typeAnnotation) return null;
  const node = typeAnnotation.typeAnnotation || typeAnnotation;
  if (!node) return null;

  switch (node.type) {
    case 'TSStringKeyword': return 'string';
    case 'TSNumberKeyword': return 'number';
    case 'TSBooleanKeyword': return 'boolean';
    case 'TSVoidKeyword': return 'void';
    case 'TSAnyKeyword': return 'any';
    case 'TSNullKeyword': return 'null';
    case 'TSUndefinedKeyword': return 'undefined';
    case 'TSArrayType': return `${stringifyType(node.elementType) || 'unknown'}[]`;
    case 'TSTypeReference': return node.typeName ? node.typeName.name : 'unknown';
    case 'TSUnionType': return node.types.map((t) => stringifyType(t)).join(' | ');
    case 'Identifier': return node.name;
    default: return node.type ? node.type.replace(/^TS|Keyword$/g, '') : 'unknown';
  }
}

function describeParam(param) {
  if (!param) return { name: 'unknown', type: null, optional: false };
  switch (param.type) {
    case 'Identifier':
      return {
        name: param.name,
        type: stringifyType(param.typeAnnotation),
        optional: Boolean(param.optional),
        default: null,
      };
    case 'AssignmentPattern':
      return {
        name: param.left.name || 'param',
        type: stringifyType(param.left.typeAnnotation),
        optional: true,
        default: param.right && param.right.type === 'Literal'
          ? String(param.right.value)
          : undefined,
      };
    case 'RestElement':
      return {
        name: `...${param.argument.name || 'args'}`,
        type: null,
        optional: false,
        default: null,
      };
    case 'ObjectPattern':
      return {
        name: `{ ${param.properties
          .map((p) => (p.key && p.key.name) || '…')
          .join(', ')} }`,
        type: null,
        optional: false,
        default: null,
      };
    default:
      return { name: param.name || param.type, type: null, optional: false };
  }
}

function extractLeadingComment(node) {
  const comments = node && node.leadingComments;
  if (!comments || comments.length === 0) return null;
  const raw = comments[comments.length - 1].value;
  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trim())
    .filter((line) => line && !line.startsWith('@'))
    .join(' ')
    .trim() || null;
}

function locOf(node) {
  return node.loc ? node.loc.start.line : null;
}

function parseSource(code) {
  try {
    return parse(code, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
      errorRecovery: false,
      plugins: PARSER_PLUGINS,
    });
  } catch (err) {
    const where = err.loc ? ` (line ${err.loc.line})` : '';
    const e = new Error(`Failed to parse source: ${err.message}${where}`);
    e.code = 'AST_PARSE_ERROR';
    throw e;
  }
}

function analyzeCode(code) {
  const safeCode = typeof code === 'string' ? code : '';
  const looksTs = /:\s*(string|number|boolean|any|void)\b|interface\s+\w+/.test(safeCode);
  const ast = parseSource(safeCode);

  const functions = [];
  const classes = [];
  const exportsFound = [];
  const seen = new Set();

  function recordFunction(name, node, { kind = 'function', exported = false, commentNode } = {}) {
    const key = `${name}:${locOf(node)}`;
    if (seen.has(key)) return;
    seen.add(key);
    functions.push({
      name: name || '(anonymous)',
      kind,
      async: Boolean(node.async),
      generator: Boolean(node.generator),
      params: (node.params || []).map(describeParam),
      returnType: stringifyType(node.returnType),
      description: extractLeadingComment(node) || extractLeadingComment(commentNode) || null,
      line: locOf(node),
      exported,
    });
  }

  traverse(ast, {
    FunctionDeclaration(path) {
      const name = path.node.id ? path.node.id.name : '(anonymous)';
      const exported = path.parent && (
        path.parent.type === 'ExportNamedDeclaration' ||
        path.parent.type === 'ExportDefaultDeclaration'
      );
      recordFunction(name, path.node, { kind: 'function', exported: Boolean(exported), commentNode: path.parent });
    },

    VariableDeclarator(path) {
      const init = path.node.init;
      if (
        init &&
        (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') &&
        path.node.id && path.node.id.name
      ) {
        recordFunction(path.node.id.name, init, {
          kind: init.type === 'ArrowFunctionExpression' ? 'arrow' : 'function',
        });
      }
    },

    ClassDeclaration(path) {
      const node = path.node;
      const methods = [];
      for (const member of node.body.body) {
        if (member.type === 'ClassMethod') {
          methods.push({
            name: member.key.name || '(computed)',
            kind: member.kind,
            static: Boolean(member.static),
            async: Boolean(member.async),
            params: (member.params || []).map(describeParam),
            returnType: stringifyType(member.returnType),
            description: extractLeadingComment(member),
            line: locOf(member),
          });
        }
      }
      classes.push({
        name: node.id ? node.id.name : '(anonymous)',
        superClass: node.superClass ? node.superClass.name : null,
        description: extractLeadingComment(node),
        methods,
        line: locOf(node),
      });
    },

    ExportNamedDeclaration(path) {
      const decl = path.node.declaration;
      if (decl) {
        if (decl.type === 'FunctionDeclaration' && decl.id) {
          exportsFound.push({ name: decl.id.name, kind: 'function', default: false });
        } else if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if (d.id && d.id.name) {
              exportsFound.push({ name: d.id.name, kind: 'variable', default: false });
            }
          }
        }
      }
      for (const spec of path.node.specifiers || []) {
        exportsFound.push({ name: spec.exported.name, kind: 'reference', default: false });
      }
    },

    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      const name = (decl.id && decl.id.name) || '(default export)';
      exportsFound.push({ name, kind: decl.type, default: true });
    },
  });

  const exportedNames = new Set(exportsFound.map((e) => e.name));
  for (const fn of functions) {
    if (exportedNames.has(fn.name)) fn.exported = true;
  }

  return {
    language: looksTs ? 'typescript' : 'javascript',
    functions: functions.sort((a, b) => (a.line || 0) - (b.line || 0)),
    classes: classes.sort((a, b) => (a.line || 0) - (b.line || 0)),
    exports: exportsFound,
    stats: {
      functionCount: functions.length,
      classCount: classes.length,
      exportCount: exportsFound.length,
      lineCount: safeCode.split('\n').length,
    },
  };
}

module.exports = {
  analyzeCode,
  parseSource,
  _internal: { describeParam, stringifyType, extractLeadingComment },
};