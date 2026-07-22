import { describe, expect, it } from 'vitest';
import { applyAnswer, bulkKnown, emptyState, getWP, parseState, serialize, setStatus, toggleFlag, loadState, STORAGE_KEY } from './store';

const T = 1_800_000_000_000;

describe('applyAnswer', () => {
  it('marque connu au premier succès', () => {
    const st = applyAnswer(emptyState(), 'cat', true, T);
    expect(getWP(st, 'cat')).toMatchObject({ s: 2, streak: 1, lapses: 0 });
    expect(st.events).toEqual([['cat', T, 1, 'r', 1]]);
  });

  it('un échec met en cours et casse la série', () => {
    let st = applyAnswer(emptyState(), 'cat', true, T);
    st = applyAnswer(st, 'cat', false, T + 1);
    expect(getWP(st, 'cat')).toMatchObject({ s: 1, streak: 0, lapses: 1 });
    // régression connue → tr -1
    expect(st.events[1]).toEqual(['cat', T + 1, 0, 'r', -1]);
  });

  it('succès sur mot déjà connu : pas de transition', () => {
    let st = applyAnswer(emptyState(), 'cat', true, T);
    st = applyAnswer(st, 'cat', true, T + 1);
    expect(getWP(st, 'cat').streak).toBe(2);
    expect(st.events[1][4]).toBe(0);
  });

  it('auto-flag à 2 échecs, une seule fois', () => {
    let st = applyAnswer(emptyState(), 'cat', false, T);
    expect(getWP(st, 'cat').flag).toBe(false);
    st = applyAnswer(st, 'cat', false, T + 1);
    expect(getWP(st, 'cat')).toMatchObject({ flag: true, auto: true });
    // l'utilisateur retire le flag → jamais reposé automatiquement
    st = toggleFlag(st, 'cat');
    st = applyAnswer(st, 'cat', false, T + 2);
    st = applyAnswer(st, 'cat', false, T + 3);
    expect(getWP(st, 'cat').flag).toBe(false);
  });

  it('un flag manuel n’est pas écrasé par l’auto-flag', () => {
    let st = toggleFlag(emptyState(), 'cat');
    st = applyAnswer(st, 'cat', false, T);
    st = applyAnswer(st, 'cat', false, T + 1);
    expect(getWP(st, 'cat')).toMatchObject({ flag: true, auto: false });
  });
});

describe('setStatus / bulkKnown', () => {
  it('setStatus vers connu émet un événement bulk', () => {
    const st = setStatus(emptyState(), 'cat', 2, T);
    expect(getWP(st, 'cat')).toMatchObject({ s: 2, streak: 1 });
    expect(st.events).toEqual([['cat', T, 1, 'b', 1]]);
  });

  it('setStatus connu → nouveau remet la série à zéro', () => {
    let st = setStatus(emptyState(), 'cat', 2, T);
    st = setStatus(st, 'cat', 0, T + 1);
    expect(getWP(st, 'cat')).toMatchObject({ s: 0, streak: 0 });
    expect(st.events[1][4]).toBe(-1);
  });

  it('bulkKnown ignore les mots déjà connus', () => {
    let st = applyAnswer(emptyState(), 'a', true, T);
    st = bulkKnown(st, ['a', 'b', 'c'], T + 1);
    expect(getWP(st, 'b').s).toBe(2);
    expect(getWP(st, 'c').s).toBe(2);
    const bulkEvents = st.events.filter((e) => e[3] === 'b');
    expect(bulkEvents.map((e) => e[0]).sort()).toEqual(['b', 'c']);
  });
});

describe('sérialisation', () => {
  it('roundtrip', () => {
    let st = applyAnswer(emptyState(), 'cat', true, T);
    st = applyAnswer(st, 'dog', false, T + 1);
    st = toggleFlag(st, 'dog');
    expect(parseState(serialize(st))).toEqual(st);
  });

  it.each(['not json', '[]', '{}', '{"version":99,"words":{},"events":[]}', '{"version":1,"words":[],"events":[]}'])(
    'rejette %s', (bad) => expect(parseState(bad)).toBeNull(),
  );

  it('loadState : état corrompu → vierge + sauvegarde .corrupt', () => {
    const mem = new Map<string, string>();
    mem.set(STORAGE_KEY, '{broken');
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    const st = loadState(storage);
    expect(st.events).toEqual([]);
    expect(mem.get(`${STORAGE_KEY}.corrupt`)).toBe('{broken');
  });
});
