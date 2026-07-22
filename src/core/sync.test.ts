import { describe, expect, it } from 'vitest';
import { applyAnswer, emptyState, setSettings, toggleFlag } from './store';
import { mergeStates } from './sync';

const T = 1_800_000_000_000;

describe('mergeStates', () => {
  it('réunit des mots disjoints', () => {
    const a = applyAnswer(emptyState(), 'cat', true, T);
    const b = applyAnswer(emptyState(), 'dog', true, T + 1);
    const m = mergeStates(a, b);
    expect(m.words.cat.s).toBe(2);
    expect(m.words.dog.s).toBe(2);
    expect(m.events).toHaveLength(2);
  });

  it('pour un même mot, la version la plus récente gagne, dans les deux sens', () => {
    const a = applyAnswer(emptyState(), 'cat', true, T);        // connu à T
    const b = applyAnswer(emptyState(), 'cat', false, T + 10);  // raté à T+10
    expect(mergeStates(a, b).words.cat.s).toBe(1);
    expect(mergeStates(b, a).words.cat.s).toBe(1);
  });

  it('un mot jamais daté (flag seul) s’efface devant une version datée', () => {
    const a = toggleFlag(emptyState(), 'cat');                  // last: null
    const b = applyAnswer(emptyState(), 'cat', true, T);
    expect(mergeStates(a, b).words.cat.s).toBe(2);
    expect(mergeStates(b, a).words.cat.s).toBe(2);
  });

  it('dédoublonne les événements communs et trie par date', () => {
    let base = applyAnswer(emptyState(), 'cat', true, T);
    const a = applyAnswer(base, 'dog', true, T + 5);
    const b = applyAnswer(base, 'bee', true, T + 2);
    const m = mergeStates(a, b);
    expect(m.events).toHaveLength(3);
    expect(m.events.map((e) => e[0])).toEqual(['cat', 'bee', 'dog']);
  });

  it('prend les réglages du côté le plus actif récemment', () => {
    let a = setSettings(emptyState(), { dailyGoal: 50 });
    a = applyAnswer(a, 'cat', true, T);
    let b = setSettings(emptyState(), { dailyGoal: 10 });
    b = applyAnswer(b, 'dog', true, T + 100);
    expect(mergeStates(a, b).settings.dailyGoal).toBe(10);
    expect(mergeStates(b, a).settings.dailyGoal).toBe(10);
  });

  it('fusion avec un état vide = état inchangé', () => {
    let a = applyAnswer(emptyState(), 'cat', true, T);
    a = applyAnswer(a, 'dog', false, T + 1);
    expect(mergeStates(a, emptyState())).toEqual({ ...a, settings: a.settings });
    expect(mergeStates(emptyState(), a).words).toEqual(a.words);
  });
});
