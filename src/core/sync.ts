import type { ProgressState, ReviewEvent, WordProgress } from './types';

/** Garde-fou de taille pour le journal d'événements synchronisé. */
const MAX_EVENTS = 20_000;

const lastEventTs = (st: ProgressState): number =>
  st.events.length > 0 ? st.events[st.events.length - 1][1] : 0;

const recency = (wp: WordProgress): number => wp.last ?? -1;

/**
 * Fusionne deux états de progression (appareil local et copie distante).
 * Mot par mot, la version la plus récente gagne (champ `last`).
 * Les événements sont réunis, dédoublonnés et triés par date.
 * Les réglages viennent de l'état dont l'activité est la plus récente.
 */
export function mergeStates(a: ProgressState, b: ProgressState): ProgressState {
  const words: Record<string, WordProgress> = { ...a.words };
  for (const [id, wb] of Object.entries(b.words)) {
    const wa = words[id];
    if (!wa || recency(wb) > recency(wa)) words[id] = wb;
  }

  const seen = new Set<string>();
  const events: ReviewEvent[] = [];
  for (const ev of [...a.events, ...b.events]) {
    const key = ev.join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(ev);
  }
  events.sort((x, y) => x[1] - y[1]);

  const settings = lastEventTs(b) > lastEventTs(a) ? { ...b.settings } : { ...a.settings };

  return { version: 1, settings, words, events: events.slice(-MAX_EVENTS) };
}
