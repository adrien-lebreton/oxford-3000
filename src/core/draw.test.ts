import { describe, expect, it } from 'vitest';
import { applyAnswer, emptyState, setStatus, toggleFlag } from './store';
import { draw, pool, triagePool } from './draw';
import type { Level, Word } from './types';

const mkWord = (id: string, ord = 0, level: Level = 'A1'): Word => ({
  id, word: id, note: null, hom: null,
  senses: [{ pos: 'n.', level }], level, ord,
  ipa: `/${id}/`, fr: id, def: id, ex: `${id}.`,
});

const WORDS = Array.from({ length: 30 }, (_, i) => mkWord(`w${i}`, i));

// PRNG déterministe (mulberry32) pour des tests reproductibles
const seeded = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('pool', () => {
  it('filtre selon le mode', () => {
    let st = emptyState();
    st = applyAnswer(st, 'w0', true, 1);   // connu
    st = applyAnswer(st, 'w1', false, 2);  // en cours
    st = toggleFlag(st, 'w2');             // difficile (jamais vu)
    expect(pool(WORDS, st, 'all')).toHaveLength(30);
    expect(pool(WORDS, st, 'unknown').map((w) => w.id)).not.toContain('w0');
    expect(pool(WORDS, st, 'unknown')).toHaveLength(29);
    expect(pool(WORDS, st, 'difficult').map((w) => w.id)).toEqual(['w2']);
    const fresh = pool(WORDS, st, 'new').map((w) => w.id);
    expect(fresh).not.toContain('w0');
    expect(fresh).not.toContain('w1');
    expect(fresh).toContain('w2');
  });
});

describe('triagePool', () => {
  const mixed = [
    mkWord('a', 0, 'A1'), mkWord('b', 1, 'A2'), mkWord('c', 2, 'A1'), mkWord('d', 3, 'B2'),
  ];

  it('ne garde que les mots jamais vus, dans l’ordre de la liste', () => {
    let st = emptyState();
    st = setStatus(st, 'a', 2, 1);      // connu → exclu
    st = applyAnswer(st, 'c', false, 2); // en cours → exclu
    expect(triagePool(mixed, st, 'all', new Set()).map((w) => w.id)).toEqual(['b', 'd']);
  });

  it('filtre par niveau', () => {
    expect(triagePool(mixed, emptyState(), 'A1', new Set()).map((w) => w.id)).toEqual(['a', 'c']);
    expect(triagePool(mixed, emptyState(), 'B2', new Set()).map((w) => w.id)).toEqual(['d']);
  });

  it('exclut les mots passés pendant la session', () => {
    expect(triagePool(mixed, emptyState(), 'all', new Set(['a', 'd'])).map((w) => w.id)).toEqual(['b', 'c']);
  });

  it('un mot dé-marqué (annuler) revient en tête de file', () => {
    let st = setStatus(emptyState(), 'a', 2, 1);
    expect(triagePool(mixed, st, 'A1', new Set())[0].id).toBe('c');
    st = setStatus(st, 'a', 0, 2); // annuler
    expect(triagePool(mixed, st, 'A1', new Set())[0].id).toBe('a');
  });
});

describe('draw', () => {
  it('tire n mots uniques du pool', () => {
    const picked = draw(WORDS, emptyState(), 'all', 15, { rng: seeded(42) });
    expect(picked).toHaveLength(15);
    expect(new Set(picked.map((w) => w.id)).size).toBe(15);
  });

  it('pool plus petit que n → tout le pool', () => {
    let st = emptyState();
    st = toggleFlag(st, 'w3');
    st = toggleFlag(st, 'w7');
    expect(draw(WORDS, st, 'difficult', 15, { rng: seeded(1) })).toHaveLength(2);
  });

  it('est déterministe à seed fixée et varie avec la seed', () => {
    const a = draw(WORDS, emptyState(), 'all', 5, { rng: seeded(7) }).map((w) => w.id);
    const b = draw(WORDS, emptyState(), 'all', 5, { rng: seeded(7) }).map((w) => w.id);
    const c = draw(WORDS, emptyState(), 'all', 5, { rng: seeded(8) }).map((w) => w.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('ne modifie pas la liste source', () => {
    const before = WORDS.map((w) => w.id);
    draw(WORDS, emptyState(), 'all', 10, { rng: seeded(3) });
    expect(WORDS.map((w) => w.id)).toEqual(before);
  });
});

describe('filtre par niveau (pool + draw)', () => {
  const mixed = [
    mkWord('a', 0, 'A1'), mkWord('b', 1, 'A1'), mkWord('c', 2, 'A2'),
    mkWord('d', 3, 'B1'), mkWord('e', 4, 'B2'),
  ];

  it('pool croise le mode et le niveau', () => {
    let st = emptyState();
    st = setStatus(st, 'a', 2, 1); // a connu
    expect(pool(mixed, st, 'all', 'A1').map((w) => w.id)).toEqual(['a', 'b']);
    expect(pool(mixed, st, 'unknown', 'A1').map((w) => w.id)).toEqual(['b']);
    expect(pool(mixed, st, 'unknown', 'all')).toHaveLength(4);
    expect(pool(mixed, st, 'new', 'B2').map((w) => w.id)).toEqual(['e']);
  });

  it('draw ne tire que des mots du niveau demandé', () => {
    const picked = draw(mixed, emptyState(), 'all', 5, { rng: seeded(9), level: 'A1' });
    expect(picked.length).toBe(2);
    expect(picked.every((w) => w.level === 'A1')).toBe(true);
  });
});
