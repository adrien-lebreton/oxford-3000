import type { ProgressState, ReviewEvent, Settings, Status, WordProgress } from './types';

export const STORAGE_KEY = 'oxford3000.v1';

export const defaultSettings = (): Settings => ({ dailyGoal: 20, autoAudio: false, sessionSize: 15 });

export const emptyState = (): ProgressState => ({
  version: 1,
  settings: defaultSettings(),
  words: {},
  events: [],
});

export const defaultWP = (): WordProgress => ({ s: 0, streak: 0, lapses: 0, flag: false, auto: false, last: null });

export const getWP = (st: ProgressState, id: string): WordProgress => st.words[id] ?? defaultWP();

/** Réponse en révision : « Je connais » (ok) ou « Pas encore ». */
export function applyAnswer(st: ProgressState, id: string, ok: boolean, now: number): ProgressState {
  const wp = getWP(st, id);
  const wasKnown = wp.s === 2;
  let next: WordProgress;
  if (ok) {
    next = { ...wp, s: 2, streak: wp.streak + 1, last: now };
  } else {
    next = { ...wp, s: 1, streak: 0, lapses: wp.lapses + 1, last: now };
    // Auto-marquage « difficile » à partir de 2 échecs, une seule fois :
    // si l'utilisateur retire le flag ensuite, on ne le repose jamais.
    if (!next.flag && !next.auto && next.lapses >= 2) {
      next = { ...next, flag: true, auto: true };
    }
  }
  const tr: -1 | 0 | 1 = ok && !wasKnown ? 1 : !ok && wasKnown ? -1 : 0;
  const ev: ReviewEvent = [id, now, ok ? 1 : 0, 'r', tr];
  return { ...st, words: { ...st.words, [id]: next }, events: [...st.events, ev] };
}

/** Changement manuel de statut (fiche mot, marquage en masse). Source 'b' : exclu du rythme. */
export function setStatus(st: ProgressState, id: string, s: Status, now: number): ProgressState {
  const wp = getWP(st, id);
  if (wp.s === s) return st;
  const tr: -1 | 0 | 1 = s === 2 ? 1 : wp.s === 2 ? -1 : 0;
  const next: WordProgress = { ...wp, s, streak: s === 2 ? Math.max(1, wp.streak) : 0, last: now };
  const events = tr !== 0
    ? [...st.events, [id, now, s === 2 ? 1 : 0, 'b', tr] as ReviewEvent]
    : st.events;
  return { ...st, words: { ...st.words, [id]: next }, events };
}

/** « Je connais déjà tous ces mots » sur une sélection. */
export function bulkKnown(st: ProgressState, ids: string[], now: number): ProgressState {
  const words = { ...st.words };
  const events = [...st.events];
  let changed = false;
  for (const id of ids) {
    const wp = words[id] ?? defaultWP();
    if (wp.s === 2) continue;
    words[id] = { ...wp, s: 2, streak: Math.max(1, wp.streak), last: now };
    events.push([id, now, 1, 'b', 1]);
    changed = true;
  }
  return changed ? { ...st, words, events } : st;
}

export function toggleFlag(st: ProgressState, id: string): ProgressState {
  const wp = getWP(st, id);
  return { ...st, words: { ...st.words, [id]: { ...wp, flag: !wp.flag } } };
}

export function setSettings(st: ProgressState, patch: Partial<Settings>): ProgressState {
  return { ...st, settings: { ...st.settings, ...patch } };
}

/** Parse + validation d'un état sérialisé (localStorage ou import). null si invalide. */
export function parseState(json: string): ProgressState | null {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return null; }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (typeof o.words !== 'object' || o.words === null || Array.isArray(o.words)) return null;
  if (!Array.isArray(o.events)) return null;
  const st = emptyState();
  st.settings = { ...st.settings, ...(typeof o.settings === 'object' && o.settings !== null ? o.settings : {}) };
  for (const [id, wp] of Object.entries(o.words as Record<string, unknown>)) {
    if (typeof wp !== 'object' || wp === null) return null;
    const w = wp as Record<string, unknown>;
    if (![0, 1, 2].includes(w.s as number)) return null;
    st.words[id] = {
      s: w.s as Status,
      streak: typeof w.streak === 'number' ? w.streak : 0,
      lapses: typeof w.lapses === 'number' ? w.lapses : 0,
      flag: w.flag === true,
      auto: w.auto === true,
      last: typeof w.last === 'number' ? w.last : null,
    };
  }
  for (const ev of o.events as unknown[]) {
    if (!Array.isArray(ev) || typeof ev[0] !== 'string' || typeof ev[1] !== 'number') return null;
    st.events.push([
      ev[0],
      ev[1],
      ev[2] ? 1 : 0,
      ev[3] === 'b' ? 'b' : 'r',
      ev[4] === 1 ? 1 : ev[4] === -1 ? -1 : 0,
    ]);
  }
  return st;
}

export const serialize = (st: ProgressState): string => JSON.stringify(st);

/** Chargement localStorage : état corrompu → sauvegardé en .corrupt puis état vierge. */
export function loadState(storage: Pick<Storage, 'getItem' | 'setItem'>): ProgressState {
  const json = storage.getItem(STORAGE_KEY);
  if (json == null) return emptyState();
  const st = parseState(json);
  if (st) return st;
  try { storage.setItem(`${STORAGE_KEY}.corrupt`, json); } catch { /* best effort */ }
  return emptyState();
}

export function saveState(storage: Pick<Storage, 'setItem'>, st: ProgressState): void {
  try { storage.setItem(STORAGE_KEY, serialize(st)); } catch { /* quota/privé : tant pis */ }
}
