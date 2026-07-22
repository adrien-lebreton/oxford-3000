// Extract multi-sense words from src/data/words.json into data/chunks/alt-input-NN.json
// batches, for the "one example per sense" enrichment pass.
import { readFileSync, writeFileSync } from 'node:fs';

const words = JSON.parse(readFileSync(new URL('../src/data/words.json', import.meta.url), 'utf8'));
const affected = words.filter((w) => w.senses.length >= 2 || w.fr.includes(' ; '));
console.log(`mots multi-sens : ${affected.length}`);

const SIZE = 120;
let n = 0;
for (let i = 0; i < affected.length; i += SIZE) {
  n++;
  const chunk = affected.slice(i, i + SIZE).map(({ id, word, note, senses, ipa, fr, def, ex }) =>
    ({ id, word, note, senses, ipa, fr, def, ex }));
  const name = `alt-input-${String(n).padStart(2, '0')}.json`;
  writeFileSync(new URL(`../data/chunks/${name}`, import.meta.url), JSON.stringify(chunk, null, 1));
  console.log(name, chunk.length, `(${chunk[0].word} → ${chunk[chunk.length - 1].word})`);
}
