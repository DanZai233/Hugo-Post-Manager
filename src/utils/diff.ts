export interface DiffLine {
  type: 'add' | 'delete' | 'normal';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffResult {
  additions: number;
  deletions: number;
  lines: DiffLine[];
  hasChanges: boolean;
}

/**
 * Fast LCS-based line diff with prefix and suffix trimming optimization.
 */
export function computeLineDiff(oldText: string, newText: string): DiffResult {
  if (oldText === newText) {
    const lines = oldText ? oldText.split(/\r?\n/) : [];
    return {
      additions: 0,
      deletions: 0,
      hasChanges: false,
      lines: lines.map((l, i) => ({
        type: 'normal',
        oldLineNumber: i + 1,
        newLineNumber: i + 1,
        content: l,
      })),
    };
  }

  // If old is empty, all lines are added
  if (!oldText) {
    const lines = newText.split(/\r?\n/);
    return {
      additions: lines.length,
      deletions: 0,
      hasChanges: true,
      lines: lines.map((l, i) => ({
        type: 'add',
        newLineNumber: i + 1,
        content: l,
      })),
    };
  }

  // If new is empty, all lines are deleted
  if (!newText) {
    const lines = oldText.split(/\r?\n/);
    return {
      additions: 0,
      deletions: lines.length,
      hasChanges: true,
      lines: lines.map((l, i) => ({
        type: 'delete',
        oldLineNumber: i + 1,
        content: l,
      })),
    };
  }

  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);

  // 1. Trim identical prefix
  let prefixCount = 0;
  while (
    prefixCount < oldLines.length &&
    prefixCount < newLines.length &&
    oldLines[prefixCount] === newLines[prefixCount]
  ) {
    prefixCount++;
  }

  // 2. Trim identical suffix
  let suffixCount = 0;
  while (
    suffixCount < oldLines.length - prefixCount &&
    suffixCount < newLines.length - prefixCount &&
    oldLines[oldLines.length - 1 - suffixCount] === newLines[newLines.length - 1 - suffixCount]
  ) {
    suffixCount++;
  }

  const midOld = oldLines.slice(prefixCount, oldLines.length - suffixCount);
  const midNew = newLines.slice(prefixCount, newLines.length - suffixCount);

  // 3. LCS on middle section
  const m = midOld.length;
  const n = midNew.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (midOld[i] === midNew[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack middle section
  const midDiff: DiffLine[] = [];
  let i = m;
  let j = n;
  let currentOldLine = prefixCount + m;
  let currentNewLine = prefixCount + n;

  const backtrackItems: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && midOld[i - 1] === midNew[j - 1]) {
      backtrackItems.push({
        type: 'normal',
        oldLineNumber: currentOldLine,
        newLineNumber: currentNewLine,
        content: midOld[i - 1],
      });
      i--;
      j--;
      currentOldLine--;
      currentNewLine--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      backtrackItems.push({
        type: 'add',
        newLineNumber: currentNewLine,
        content: midNew[j - 1],
      });
      j--;
      currentNewLine--;
    } else {
      backtrackItems.push({
        type: 'delete',
        oldLineNumber: currentOldLine,
        content: midOld[i - 1],
      });
      i--;
      currentOldLine--;
    }
  }

  backtrackItems.reverse();

  // Assemble full lines: prefix + middle + suffix
  const allLines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  // Prefix
  for (let p = 0; p < prefixCount; p++) {
    allLines.push({
      type: 'normal',
      oldLineNumber: p + 1,
      newLineNumber: p + 1,
      content: oldLines[p],
    });
  }

  // Middle
  for (const item of backtrackItems) {
    if (item.type === 'add') additions++;
    if (item.type === 'delete') deletions++;
    allLines.push(item);
  }

  // Suffix
  const oldSuffixStart = oldLines.length - suffixCount;
  const newSuffixStart = newLines.length - suffixCount;
  for (let s = 0; s < suffixCount; s++) {
    allLines.push({
      type: 'normal',
      oldLineNumber: oldSuffixStart + s + 1,
      newLineNumber: newSuffixStart + s + 1,
      content: oldLines[oldSuffixStart + s],
    });
  }

  return {
    additions,
    deletions,
    lines: allLines,
    hasChanges: additions > 0 || deletions > 0,
  };
}

export interface FrontMatterChange {
  key: string;
  label: string;
  oldVal: string;
  newVal: string;
  hasChanged: boolean;
}

export function compareFrontMatter(
  oldFM: Record<string, any> = {},
  newFM: Record<string, any> = {}
): FrontMatterChange[] {
  const fields = [
    { key: 'title', label: '文章标题' },
    { key: 'date', label: '发布时间' },
    { key: 'draft', label: '草稿状态' },
    { key: 'slug', label: 'Slug 别名' },
    { key: 'tags', label: '标签' },
    { key: 'categories', label: '分类' },
    { key: 'summary', label: '摘要' },
  ];

  const formatVal = (v: any) => {
    if (v === undefined || v === null) return '(未设置)';
    if (typeof v === 'boolean') return v ? 'true (草稿)' : 'false (正式发布)';
    if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : '(空)';
    return String(v);
  };

  return fields.map((f) => {
    const oldV = formatVal(oldFM[f.key]);
    const newV = formatVal(newFM[f.key]);
    return {
      key: f.key,
      label: f.label,
      oldVal: oldV,
      newVal: newV,
      hasChanged: oldV !== newV,
    };
  });
}
