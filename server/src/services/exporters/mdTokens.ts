export type MdToken =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'hr' };

export function tokenizeMarkdown(md: string): MdToken[] {
  const src = (md ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: MdToken[] = [];
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
    if (h) { out.push({ type: 'heading', level: h[1].length, text: h[2].trim() }); i++; continue; }
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

export function stripInline(text: string): string {
  return (text ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/<\/?sub>/g, '');
}