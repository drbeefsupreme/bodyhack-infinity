// Extracts the verified source lists from research/*.md into src/content/sources.generated.json.
// IDs are <file prefix>-<number>, e.g. fw-10 = research/fullness-water.md source 10.
import { readFileSync, writeFileSync } from 'node:fs';

const FILES: Record<string, string> = {
  fw: 'research/fullness-water.md',
  dv: 'research/detail-vascularity.md',
  ms: 'research/maturity-shape.md',
  cd: 'research/conditioning.md',
};

interface Out { id: string; title: string; authors: string; year: string; url: string; kind: string; supports: string }

const KINDS: [RegExp, string][] = [
  [/judge-rulebook|rulebook/i, 'rulebook'],
  [/academic/i, 'academic'],
  [/coach-pro|coach/i, 'coach'],
  [/publication/i, 'publication'],
  [/forum/i, 'forum'],
  [/anatomy/i, 'anatomy'],
];

const out: Out[] = [];
for (const [prefix, path] of Object.entries(FILES)) {
  let text: string;
  try { text = readFileSync(path, 'utf8'); } catch { console.warn(`skip ${path}`); continue; }
  const start = text.search(/^## Sources/m);
  if (start < 0) continue;
  const end = text.slice(start + 5).search(/^## /m);
  const body = end < 0 ? text.slice(start) : text.slice(start, start + 5 + end);
  for (const line of body.split('\n')) {
    const m = line.match(/^(\d+)\.\s+(.*)$/);
    if (!m) continue;
    const [, num, rest] = m;
    const url = rest.match(/<?(https?:\/\/[^\s>]+?)>?(?=[\s,]|$)/)?.[1];
    if (!url) continue;
    const before = rest.slice(0, rest.indexOf(url)).replace(/<$/, '').trim();
    const after = rest.slice(rest.indexOf(url) + url.length).replace(/^>/, '').trim();
    let title = '', authors = '', year = '';
    const bold = before.match(/^\*{1,2}(.+?)\*{1,2}\s*[—-]?\s*(.*)$/);
    if (bold) {
      title = bold[1];
      const meta = bold[2].replace(/\.\s*$/, '');
      const y = meta.match(/(\d{4})(?!.*\d{4})/);
      year = y ? y[1] : '';
      authors = meta.replace(/,?\s*\d{4}.*$/, '').replace(/[.,]\s*$/, '');
    } else {
      // "Title. Authors. Year." form
      const parts = before.split(/\.\s+/);
      title = parts[0] ?? before;
      const y = before.match(/(\d{4})(?!.*\d{4})/);
      year = y ? y[1] : '';
      authors = parts.slice(1).filter((p) => !/^\d{4}/.test(p)).join('. ').replace(/[.,]\s*$/, '');
    }
    const kindText = after.match(/^[—–-]\s*([a-z-]+(?:\s*\([^)]*\))?)/i)?.[1] ?? after;
    const kind = KINDS.find(([r]) => r.test(kindText))?.[1] ?? 'publication';
    const supports = after.replace(/^[—–-]\s*[a-z-]+(\s*\([^)]*\))?\s*[—–.-]?\s*/i, '').trim();
    out.push({ id: `${prefix}-${num}`, title: title.replace(/\*+/g, '').replace(/\.$/, ''), authors, year, url, kind, supports });
  }
}
writeFileSync('src/content/sources.generated.json', JSON.stringify(out, null, 1));
console.log(`wrote ${out.length} sources`);
