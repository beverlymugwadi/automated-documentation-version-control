import { parse as parseComment } from 'comment-parser';

export interface JsdocParam {
  name: string;
  type: string | null;
  description: string;
  optional: boolean;
}

export interface ParsedJsdoc {
  description: string;
  params: JsdocParam[];
  returns: string | null;
  examples: string[];
  deprecated: string | null;
  /** @route METHOD /path — present in Express-style handler comments. */
  route: { method: string; path: string } | null;
  /** @access <level> — e.g. "Private (vendors only)", "Public". */
  access: string | null;
  tags: Array<{ tag: string; name: string; description: string }>;
}

const EMPTY: ParsedJsdoc = {
  description: '',
  params: [],
  returns: null,
  examples: [],
  deprecated: null,
  route: null,
  access: null,
  tags: [],
};

/**
 * Parse a raw comment string into structured JSDoc.
 * Handles block comments (/** ... *\/) and one or more // line comments.
 * Recognises @param, @returns, @example, @deprecated, @route, @access, @desc.
 */
export function parseJsdoc(raw: string | null | undefined): ParsedJsdoc | null {
  if (!raw) return null;

  let src = raw.trim();
  if (!src.startsWith('/*')) {
    // Line-comment block — strip every leading // and re-wrap as JSDoc block
    const lines = src
      .split('\n')
      .map((l) => l.replace(/^\s*\/\/\s?/, '').trim())
      .filter(Boolean);
    if (lines.length === 0) return null;
    src = `/**\n * ${lines.join('\n * ')}\n */`;
  }

  let blocks: ReturnType<typeof parseComment>;
  try {
    blocks = parseComment(src, { spacing: 'preserve' });
  } catch {
    return null;
  }

  if (!blocks.length) return null;
  const block = blocks[0];

  let description = block.description?.trim() ?? '';
  const params: JsdocParam[] = [];
  const examples: string[] = [];
  let returns: string | null = null;
  let deprecated: string | null = null;
  let route: ParsedJsdoc['route'] = null;
  let access: string | null = null;
  const extraTags: ParsedJsdoc['tags'] = [];

  for (const tag of block.tags) {
    const tagName = (tag.name ?? '').trim();
    const tagDesc = (tag.description ?? '').trim();

    switch (tag.tag) {
      case 'param':
      case 'arg':
      case 'argument': {
        const isOptional = tagName.startsWith('[') && tagName.endsWith(']');
        params.push({
          name: isOptional ? tagName.slice(1, -1).split('=')[0] : tagName,
          type: tag.type || null,
          description: tagDesc,
          optional: isOptional,
        });
        break;
      }
      case 'returns':
      case 'return':
        returns = [tag.type ? `{${tag.type}}` : '', tagDesc].filter(Boolean).join(' ') || null;
        break;
      case 'example':
        examples.push(tagDesc);
        break;
      case 'deprecated':
        deprecated = tagDesc || tagName || 'Deprecated';
        break;

      // Express-style API tags
      case 'desc':
        // @desc is an alias for the main description when above the function text
        if (!description) description = [tagName, tagDesc].filter(Boolean).join(' ');
        break;
      case 'route': {
        // @route POST /api/bookings  → name=POST, description=/api/bookings
        const method = tagName.toUpperCase();
        const path = tagDesc;
        if (method && path) route = { method, path };
        break;
      }
      case 'access':
        // @access Private (vendors only) → name=Private, description=(vendors only)
        access = [tagName, tagDesc].filter(Boolean).join(' ') || null;
        break;

      default:
        extraTags.push({ tag: tag.tag, name: tagName, description: tagDesc });
    }
  }

  // Return null only when there is genuinely nothing useful
  if (!description && !params.length && !returns && !examples.length && !deprecated && !route && !access && !extraTags.length) {
    return null;
  }

  return { description, params, returns, examples, deprecated, route, access, tags: extraTags };
}

export { EMPTY as EMPTY_JSDOC };
