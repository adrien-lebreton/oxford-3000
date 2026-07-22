// Split data/base.json into data/chunks/input-NN.json batches for enrichment
import { readFileSync, writeFileSync } from 'node:fs';

const base = JSON.parse(readFileSync(new URL('../data/base.json', import.meta.url), 'utf8'));
const SIZE = 250;
let n = 0;
for (let i = 0; i < base.length; i += SIZE) {
  n++;
  const chunk = base.slice(i, i + SIZE).map(({ id, word, note, senses }) => ({ id, word, note, senses }));
  const name = `input-${String(n).padStart(2, '0')}.json`;
  writeFileSync(new URL(`../data/chunks/${name}`, import.meta.url), JSON.stringify(chunk, null, 1));
  console.log(name, chunk.length, `(${chunk[0].word} → ${chunk[chunk.length - 1].word})`);
}
