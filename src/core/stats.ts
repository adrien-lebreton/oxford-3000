import type { Level, ProgressState, Word } from './types';
import { getWP } from './store';

export const DAY = 86_400_000;
const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

export interface Counts {
  total: number;
  known: number;
  learning: number;
  fresh: number;
  flagged: number;
  byLevel: Record<Level, { known: number; total: number }>;
}

export function counts(words: Word[], st: ProgressState): Counts {
  const c: Counts = {
    total: words.length, known: 0, learning: 0, fresh: 0, flagged: 0,
    byLevel: Object.fromEntries(LEVELS.map((l) => [l, { known: 0, total: 0 }])) as Counts['byLevel'],
  };
  for (const w of words) {
    const wp = getWP(st, w.id);
    if (wp.s === 2) c.known++; else if (wp.s === 1) c.learning++; else c.fresh++;
    if (wp.flag) c.flagged++;
    const bl = c.byLevel[w.level];
    bl.total++;
    if (wp.s === 2) bl.known++;
  }
  return c;
}

/**
 * Rythme d'apprentissage (mots devenus connus / jour) sur les `windowDays` derniers jours.
 * Seuls les événements de révision ('r') comptent ; le marquage en masse est exclu.
 * Net : les mots connus puis ratés sont soustraits. null si moins de 5 transitions.
 */
export function learningRate(st: ProgressState, now: number, windowDays = 14): number | null {
  const start = now - windowDays * DAY;
  let net = 0, signals = 0;
  let first: number | null = null;
  for (const [, ts, , src, tr] of st.events) {
    if (ts < start || ts > now || src !== 'r' || tr === 0) continue;
    net += tr;
    signals++;
    if (first === null || ts < first) first = ts;
  }
  if (first === null || signals < 5) return null;
  const days = Math.max(1, (now - first) / DAY);
  const rate = Math.max(0, net) / days;
  return rate > 0 ? rate : null;
}

export interface Eta {
  remaining: number;
  perDay: number;
  basis: 'history' | 'goal';
  /** Timestamp de la date estimée de fin, null si inestimable. */
  date: number | null;
  days: number | null;
}

/** Estimation du temps restant pour connaître les 3000 mots. */
export function estimate(c: Counts, st: ProgressState, now: number): Eta {
  const remaining = c.total - c.known;
  const hist = learningRate(st, now);
  const perDay = hist ?? st.settings.dailyGoal;
  const basis: Eta['basis'] = hist != null ? 'history' : 'goal';
  if (remaining === 0) return { remaining, perDay, basis, date: now, days: 0 };
  if (perDay <= 0) return { remaining, perDay, basis, date: null, days: null };
  const days = Math.ceil(remaining / perDay);
  return { remaining, perDay, basis, date: now + days * DAY, days };
}

export interface LevelEta {
  level: Level;
  known: number;
  total: number;
  remaining: number;
  /** Timestamp d'acquisition projetée (cumul des niveaux précédents), null si acquis ou inestimable. */
  date: number | null;
}

/**
 * Projection par niveau : à combien de temps se trouve la fin de chaque niveau,
 * en supposant qu'on avance niveau après niveau (A1 → B2) au rythme de `eta.perDay`.
 * La date du dernier niveau non acquis coïncide avec l'estimation globale.
 */
export function levelEtas(c: Counts, eta: Eta, now: number): LevelEta[] {
  let cum = 0;
  return LEVELS.map((level) => {
    const { known, total } = c.byLevel[level];
    const remaining = total - known;
    cum += remaining;
    const date = remaining > 0 && eta.perDay > 0 ? now + Math.ceil(cum / eta.perDay) * DAY : null;
    return { level, known, total, remaining, date };
  });
}

/** Clé de jour locale (YYYYMMDD) pour compter les jours de pratique. */
const dayKey = (ts: number): number => {
  const d = new Date(ts);
  return d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate();
};

/** Jours de pratique consécutifs (aujourd'hui inclus, ou en s'arrêtant hier). */
export function practiceStreak(st: ProgressState, now: number): number {
  const days = new Set<number>();
  for (const [, ts, , src] of st.events) if (src === 'r') days.add(dayKey(ts));
  if (days.size === 0) return 0;
  // Ancre à midi local pour éviter les surprises de changement d'heure
  const anchor = new Date(now);
  anchor.setHours(12, 0, 0, 0);
  let t = anchor.getTime();
  if (!days.has(dayKey(t))) t -= DAY; // pas encore pratiqué aujourd'hui : on part d'hier
  let streak = 0;
  while (days.has(dayKey(t))) { streak++; t -= DAY; }
  return streak;
}
