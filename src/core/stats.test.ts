import { describe, expect, it } from 'vitest';
import { applyAnswer, bulkKnown, emptyState, setSettings } from './store';
import { DAY, counts, estimate, learningRate, practiceStreak } from './stats';
import type { Level, Word } from './types';

const mkWord = (id: string, level: Level): Word => ({
  id, word: id, note: null, hom: null,
  senses: [{ pos: 'n.', level }], level, ord: 0,
  ipa: '', fr: '', def: '', ex: '',
});

// Timestamp local stable (un jeudi midi)
const T = new Date(2026, 6, 16, 12).getTime();

describe('counts', () => {
  it('compte statuts, flags et niveaux', () => {
    const words = [mkWord('a', 'A1'), mkWord('b', 'A1'), mkWord('c', 'B2')];
    let st = emptyState();
    st = applyAnswer(st, 'a', true, T);
    st = applyAnswer(st, 'b', false, T);
    const c = counts(words, st);
    expect(c).toMatchObject({ total: 3, known: 1, learning: 1, fresh: 1 });
    expect(c.byLevel.A1).toEqual({ known: 1, total: 2 });
    expect(c.byLevel.B2).toEqual({ known: 0, total: 1 });
  });
});

describe('learningRate', () => {
  it('null sans historique suffisant (< 5 transitions)', () => {
    let st = emptyState();
    for (let i = 0; i < 4; i++) st = applyAnswer(st, `w${i}`, true, T - i * 1000);
    expect(learningRate(st, T)).toBeNull();
  });

  it('calcule le net par jour sur la fenêtre', () => {
    let st = emptyState();
    // 6 mots appris il y a 3 jours → 6 transitions sur 3 jours
    for (let i = 0; i < 6; i++) st = applyAnswer(st, `w${i}`, true, T - 3 * DAY);
    expect(learningRate(st, T)).toBeCloseTo(2, 5);
  });

  it('soustrait les régressions et ignore le bulk et le hors-fenêtre', () => {
    let st = emptyState();
    for (let i = 0; i < 6; i++) st = applyAnswer(st, `w${i}`, true, T - 2 * DAY);
    st = applyAnswer(st, 'w0', false, T - DAY);            // régression : net 5
    st = bulkKnown(st, ['x1', 'x2', 'x3'], T - DAY);        // ignoré (bulk)
    st = applyAnswer(st, 'old', true, T - 30 * DAY);        // hors fenêtre
    expect(learningRate(st, T)).toBeCloseTo(5 / 2, 5);
  });
});

describe('estimate', () => {
  const words = Array.from({ length: 100 }, (_, i) => mkWord(`w${i}`, 'A1'));

  it('repli sur l’objectif quotidien sans historique', () => {
    let st = setSettings(emptyState(), { dailyGoal: 10 });
    st = bulkKnown(st, ['w0', 'w1'], T); // 2 connus, hors rythme
    const e = estimate(counts(words, st), st, T);
    expect(e).toMatchObject({ remaining: 98, perDay: 10, basis: 'goal', days: 10 });
    expect(e.date).toBe(T + 10 * DAY);
  });

  it('utilise le rythme observé quand il existe', () => {
    let st = emptyState();
    for (let i = 0; i < 10; i++) st = applyAnswer(st, `w${i}`, true, T - 2 * DAY);
    const e = estimate(counts(words, st), st, T);
    expect(e.basis).toBe('history');
    expect(e.perDay).toBeCloseTo(5, 5);
    expect(e.days).toBe(Math.ceil(90 / 5));
  });

  it('tout connu → 0 jour', () => {
    let st = emptyState();
    st = bulkKnown(st, words.map((w) => w.id), T);
    expect(estimate(counts(words, st), st, T)).toMatchObject({ remaining: 0, days: 0, date: T });
  });

  it('objectif à 0 sans historique → inestimable', () => {
    const st = setSettings(emptyState(), { dailyGoal: 0 });
    expect(estimate(counts(words, st), st, T)).toMatchObject({ date: null, days: null });
  });
});

describe('practiceStreak', () => {
  it('0 sans événement de révision', () => {
    let st = emptyState();
    expect(practiceStreak(st, T)).toBe(0);
    st = bulkKnown(st, ['a'], T); // le bulk ne compte pas comme pratique
    expect(practiceStreak(st, T)).toBe(0);
  });

  it('compte les jours consécutifs, aujourd’hui inclus', () => {
    let st = emptyState();
    st = applyAnswer(st, 'a', true, T);
    st = applyAnswer(st, 'b', true, T - DAY);
    st = applyAnswer(st, 'c', false, T - 2 * DAY);
    st = applyAnswer(st, 'd', true, T - 4 * DAY); // trou à J-3
    expect(practiceStreak(st, T)).toBe(3);
  });

  it('pas encore pratiqué aujourd’hui → série d’hier conservée', () => {
    let st = emptyState();
    st = applyAnswer(st, 'a', true, T - DAY);
    st = applyAnswer(st, 'b', true, T - 2 * DAY);
    expect(practiceStreak(st, T)).toBe(2);
  });
});
