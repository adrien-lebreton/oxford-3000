// Merge data/base.json + data/chunks/out-*.json into src/data/words.json,
// with validation (coverage, formats) and quality warnings.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const base = JSON.parse(readFileSync(new URL('../data/base.json', import.meta.url), 'utf8'));
const chunkDir = new URL('../data/chunks/', import.meta.url);

const enriched = new Map();
const files = readdirSync(chunkDir).filter((f) => /^out-\d+\.json$/.test(f)).sort();
for (const f of files) {
  const arr = JSON.parse(readFileSync(new URL(f, chunkDir), 'utf8'));
  for (const item of arr) {
    if (enriched.has(item.id)) throw new Error(`id en double dans les chunks: ${item.id} (${f})`);
    enriched.set(item.id, item);
  }
}
console.log(`chunks: ${files.length} fichiers, ${enriched.size} entrées`);

const missing = base.filter((e) => !enriched.has(e.id)).map((e) => e.id);
const extra = [...enriched.keys()].filter((id) => !base.some((e) => e.id === id));
if (missing.length) throw new Error(`ids manquants (${missing.length}): ${missing.slice(0, 10).join(', ')}…`);
if (extra.length) throw new Error(`ids inconnus (${extra.length}): ${extra.slice(0, 10).join(', ')}…`);

// IPA : slashes + caractères plausibles (lettres latines incluses : b, d, f…)
const IPA_OK = /^\/[^/]+\/( \((n|v|adj|adv|modal v|auxiliary v)\.\))?(, \/[^/]+\/( \((n|v|adj|adv|modal v|auxiliary v)\.\))?)?$/;
const BAD_IPA_CHARS = /[A-Z0-9€$£&#@"]/;

const warnings = [];
const out = base.map((e) => {
  const x = enriched.get(e.id);
  const ipa = String(x.ipa).trim();
  const fr = String(x.fr).trim();
  const def = String(x.def).trim();
  const ex = String(x.ex).trim();

  if (!IPA_OK.test(ipa)) warnings.push(`${e.id}: IPA au format inattendu → ${ipa}`);
  else if (BAD_IPA_CHARS.test(ipa)) warnings.push(`${e.id}: caractères suspects dans l'IPA → ${ipa}`);
  if (!fr) warnings.push(`${e.id}: traduction vide`);
  if (fr.length > 90) warnings.push(`${e.id}: traduction longue (${fr.length}) → ${fr}`);
  if (def.split(/\s+/).length > 16) warnings.push(`${e.id}: définition longue → ${def}`);
  const stem = e.word.toLowerCase().split(/[ ,]/)[0].replace(/[^a-z']/g, '').slice(0, 4);
  if (stem.length >= 3 && !ex.toLowerCase().includes(stem)) {
    warnings.push(`${e.id}: l'exemple ne semble pas contenir le mot → ${ex}`);
  }
  const words = ex.split(/\s+/).length;
  if (words < 5 || words > 20) warnings.push(`${e.id}: exemple de ${words} mots → ${ex}`);

  return { ...e, ipa, fr, def, ex };
});

// Sens secondaires (passe « alt ») : data/chunks/alt-out-*.json → champ alt
const altFiles = readdirSync(chunkDir).filter((f) => /^alt-out-\d+\.json$/.test(f)).sort();
const altMap = new Map();
for (const f of altFiles) {
  const arr = JSON.parse(readFileSync(new URL(f, chunkDir), 'utf8'));
  for (const item of arr) {
    if (altMap.has(item.id)) throw new Error(`id en double dans les chunks alt: ${item.id} (${f})`);
    altMap.set(item.id, item.alt);
  }
}
const byId2 = new Map(out.map((e) => [e.id, e]));
for (const id of altMap.keys()) {
  if (!byId2.has(id)) throw new Error(`chunk alt: id inconnu ${id}`);
}
let attached = 0;
for (const e of out) {
  const alt = altMap.get(e.id);
  if (!alt) continue;
  if (!Array.isArray(alt) || alt.length < 1 || alt.length > 2) {
    warnings.push(`${e.id}: alt de taille inattendue (${alt?.length})`);
    continue;
  }
  e.alt = alt.map((s) => ({ pos: String(s.pos).trim(), def: String(s.def).trim(), ex: String(s.ex).trim() }));
  for (const s of e.alt) {
    if (!s.pos || !s.def || !s.ex) warnings.push(`${e.id}: bloc alt incomplet`);
    if (!/\.$/.test(s.ex)) warnings.push(`${e.id}: exemple alt sans point final → ${s.ex}`);
    const stem = e.word.toLowerCase().split(/[ ,]/)[0].replace(/[^a-z']/g, '').slice(0, 4);
    if (stem.length >= 3 && !s.ex.toLowerCase().includes(stem)) {
      warnings.push(`${e.id}: l'exemple alt ne semble pas contenir le mot → ${s.ex}`);
    }
  }
  attached++;
}
const multiSense = out.filter((e) => e.senses.length >= 2 || e.fr.includes(' ; ')).length;
console.log(`sens secondaires : ${attached} mots avec alt (attendus ~${multiSense})`);

writeFileSync(new URL('../src/data/words.json', import.meta.url), JSON.stringify(out));
console.log(`écrit src/data/words.json : ${out.length} entrées`);
console.log(`avertissements (${warnings.length}) :`);
for (const w of warnings.slice(0, 60)) console.log('  ' + w);
if (warnings.length > 60) console.log(`  … et ${warnings.length - 60} de plus`);
