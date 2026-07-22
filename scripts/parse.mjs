// Parse data/raw.txt (pdftotext output of the American Oxford 3000 PDF)
// into data/base.json: [{ id, word, note, hom, senses: [{pos, level}], level, ord }]
import { readFileSync, writeFileSync } from 'node:fs';

const RAW = new URL('../data/raw.txt', import.meta.url);
const OUT = new URL('../data/base.json', import.meta.url);

const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const POS_ALTS = [
  'indefinite article', 'definite article', 'infinitive marker',
  'modal v\\.', 'auxiliary v\\.', 'exclam\\.', 'number',
  'adj\\.', 'adv\\.', 'prep\\.', 'conj\\.', 'pron\\.', 'det\\.', 'n\\.', 'v\\.',
];
const POS_FIRST = new RegExp(`(?<=\\s)(?:${POS_ALTS.join('|')})(?=[\\s,/]|$)`);
const KNOWN_POS = new Set([
  'indefinite article', 'definite article', 'infinitive marker',
  'modal v.', 'auxiliary v.', 'exclam.', 'number',
  'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'det.', 'n.', 'v.',
]);

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const cleanup = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
  // Fix glued levels ("adj.B1") and the PDF's stray "noun." variant
  .replace(/([a-z./)])((?:A|B)[12])\b/g, '$1 $2')
  .replace(/\bnoun\./g, 'n.');

const allLines = readFileSync(RAW, 'utf8').split('\n');
let skipped = 0;
const content = [];
for (const rawLine of allLines) {
  const line = cleanup(rawLine);
  if (!line) continue;
  if (/^©|^The Oxford 3000|^\d+ \/ \d+$/.test(line)) { skipped++; continue; }
  content.push(line);
}
// Re-join entries wrapped across two lines: a complete entry always ends with a level
const lines = [];
for (let i = 0; i < content.length; i++) {
  let line = content[i];
  while (!/(?:A|B)[12]$/.test(line) && i + 1 < content.length) line += ' ' + content[++i];
  lines.push(line);
}

const entries = [];
const problems = [];

for (const line of lines) {
  const m = line.match(POS_FIRST);
  if (!m) { problems.push(`NO-POS: ${line}`); continue; }
  let head = line.slice(0, m.index).trim();
  const rest = line.slice(m.index).trim();

  // Sense groups: "<pos-list> <LEVEL>" repeated, comma-separated
  const senses = [];
  const groupRe = /(.+?)\s*\b(A1|A2|B1|B2)\b(?:,\s*|$)/g;
  let g, consumed = 0;
  while ((g = groupRe.exec(rest)) !== null) {
    const pos = g[1].replace(/^[,\s]+|[,\s]+$/g, '');
    senses.push({ pos, level: g[2] });
    consumed = groupRe.lastIndex;
  }
  if (senses.length === 0 || consumed < rest.length) {
    problems.push(`BAD-GROUPS: ${line}`);
    continue;
  }
  for (const s of senses) {
    const toks = s.pos.split(/[,/]/).map((t) => t.trim()).filter(Boolean);
    for (const t of toks) if (!KNOWN_POS.has(t)) problems.push(`UNKNOWN-POS "${t}": ${line}`);
  }

  // Headword: extract "(note)" and homograph digit
  let note = null, hom = null;
  const noteM = head.match(/\(([^)]+)\)\s*$/);
  if (noteM) { note = noteM[1].trim(); head = head.slice(0, noteM.index).trim(); }
  const homM = head.match(/^(.*?)(\d)$/);
  if (homM) { hom = Number(homM[2]); head = homM[1].trim(); }
  if (!head) { problems.push(`EMPTY-HEAD: ${line}`); continue; }
  if (/\d|(?:A|B)[12]/.test(head)) problems.push(`SUSPECT-HEAD "${head}": ${line}`);

  const level = senses.reduce((min, s) =>
    LEVELS.indexOf(s.level) < LEVELS.indexOf(min) ? s.level : min, 'B2');
  const id = slug(head) + (hom ? `-${hom}` : '') + (note ? `-${slug(note)}` : '');
  entries.push({ id, word: head, note, hom, senses, level, ord: entries.length });
}

// Resolve duplicate ids caused by casing (IT/it, May/may):
// the lowercase word keeps the bare id, the capitalized/acronym one gets a suffix
const suffixFor = (w) => w === w.toUpperCase() ? 'abbr' : /^[A-Z]/.test(w) ? 'proper' : 'x';
const byId = new Map();
for (const e of entries) {
  if (byId.has(e.id)) {
    const prev = byId.get(e.id);
    const toSuffix = prev.word === prev.word.toLowerCase() ? e : prev;
    const bareId = toSuffix.id;
    toSuffix.id = `${bareId}-${suffixFor(toSuffix.word)}`;
    if (byId.has(toSuffix.id)) problems.push(`DUP-ID-UNRESOLVED: ${toSuffix.id}`);
    if (toSuffix === prev) { byId.delete(bareId); byId.set(prev.id, prev); }
  }
  byId.set(e.id, e);
}

const byLevel = {};
for (const e of entries) byLevel[e.level] = (byLevel[e.level] || 0) + 1;

writeFileSync(OUT, JSON.stringify(entries, null, 1));
console.log(`entries: ${entries.length}`);
console.log(`by min level:`, byLevel);
console.log(`skipped header/footer lines: ${skipped}`);
console.log(`problems (${problems.length}):`);
for (const p of problems.slice(0, 40)) console.log('  ' + p);
