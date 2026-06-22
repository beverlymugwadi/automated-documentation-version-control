export interface DiffLine {
  type: 'add' | 'del' | 'context';
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface Diff {
  lines: DiffLine[];
  stats: { additions: number; deletions: number };
}

export function lineDiff(a: string, b: string): Diff {
  const A = (a ?? '').split('\n');
  const B = (b ?? '').split('\n');
  const n = A.length;
  const m = B.length;

  // LCS table.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = A[i] === B[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let additions = 0;
  let deletions = 0;

  while (i < n && j < m) {
    if (A[i] === B[j]) {
      lines.push({ type: 'context', text: A[i], oldLine: i + 1, newLine: j + 1 });
      i++; j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      lines.push({ type: 'del', text: A[i], oldLine: i + 1, newLine: null });
      i++; deletions++;
    } else {
      lines.push({ type: 'add', text: B[j], oldLine: null, newLine: j + 1 });
      j++; additions++;
    }
  }
  while (i < n) { lines.push({ type: 'del', text: A[i], oldLine: i + 1, newLine: null }); i++; deletions++; }
  while (j < m) { lines.push({ type: 'add', text: B[j], oldLine: null, newLine: j + 1 }); j++; additions++; }

  return { lines, stats: { additions, deletions } };
}