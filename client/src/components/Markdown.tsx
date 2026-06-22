import { Fragment, type ReactNode } from 'react';
import { CodeBlock } from './CodeBlock';

type Token =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'hr' }
  | { type: 'list'; items: string[] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'table'; rows: string[][] };

function tokenize(md: string): Token[] {
  const src = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const line = src[i];
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < src.length && !/^```/.test(src[i])) buf.push(src[i++]);
      i += 1;
      out.push({ type: 'code', lang, text: buf.join('\n') });
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push({ type: 'heading', level: h[1].length, text: h[2] }); i++; continue; }
    if (/^>\s?/.test(line)) { out.push({ type: 'quote', text: line.replace(/^>\s?/, '') }); i++; continue; }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { out.push({ type: 'hr' }); i++; continue; }
    if (/^\|.*\|$/.test(line) && i + 1 < src.length && /^\|[\s:|-]+\|$/.test(src[i + 1])) {
      const rows: string[][] = [];
      const cells = (l: string) => l.slice(1, -1).split('|').map((c) => c.trim());
      rows.push(cells(line));
      i += 2;
      while (i < src.length && /^\|.*\|$/.test(src[i])) rows.push(cells(src[i++]));
      out.push({ type: 'table', rows });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < src.length && /^\s*[-*]\s+/.test(src[i])) items.push(src[i++].replace(/^\s*[-*]\s+/, '').trim());
      out.push({ type: 'list', items });
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    const para: string[] = [];
    while (i < src.length && src[i].trim() !== '' && !/^(#{1,6}\s|```|>\s?|\s*[-*]\s+|\||-{3,}$)/.test(src[i])) {
      para.push(src[i++].trim());
    }
    out.push({ type: 'paragraph', text: para.join(' ') });
  }
  return out;
}

function inline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|<sub>.*?<\/sub>)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${n++}`;
    if (tok.startsWith('`')) nodes.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('**')) nodes.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('<sub>')) nodes.push(<small key={k} className="faint">{tok.replace(/<\/?sub>/g, '')}</small>);
    else nodes.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ content }: { content: string }) {
  const tokens = tokenize(content);
  return (
    <div className="prose">
      {tokens.map((tok, idx) => {
        const key = `t${idx}`;
        switch (tok.type) {
          case 'heading': {
            const Tag = `h${tok.level}` as 'h1';
            return <Tag key={key}>{inline(tok.text, key)}</Tag>;
          }
          case 'paragraph': return <p key={key}>{inline(tok.text, key)}</p>;
          case 'quote': return <blockquote key={key}>{inline(tok.text, key)}</blockquote>;
          case 'hr': return <hr key={key} />;
          case 'list':
            return <ul key={key}>{tok.items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}</ul>;
          case 'code': return <CodeBlock key={key} code={tok.text} lang={tok.lang || 'typescript'} />;
          case 'table': {
            const [head, ...body] = tok.rows;
            return (
              <table key={key}>
                <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `${key}h${j}`)}</th>)}</tr></thead>
                <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `${key}${ri}${ci}`)}</td>)}</tr>)}</tbody>
              </table>
            );
          }
          default: return <Fragment key={key} />;
        }
      })}
    </div>
  );
}