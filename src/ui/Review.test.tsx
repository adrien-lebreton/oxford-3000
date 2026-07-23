// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { AppProvider } from '../state';
import { Review } from './Review';

// jsdom ≥ 27 ne fournit plus localStorage : stub mémoire pour loadState/saveState.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    get length() { return storage.size; },
    clear: () => storage.clear(),
    getItem: (k: string) => storage.get(k) ?? null,
    key: (i: number) => [...storage.keys()][i] ?? null,
    removeItem: (k: string) => { storage.delete(k); },
    setItem: (k: string, v: string) => { storage.set(k, String(v)); },
  } satisfies Storage,
});

// Pas de réseau dans les tests : la synchro Supabase est neutralisée.
vi.mock('../lib/supabase', () => ({
  syncConfigured: false,
  getClient: () => null,
  pullRemote: async () => null,
  pushRemote: async () => {},
  frenchAuthError: (m: string) => m,
}));

/** Monte une session de révision démarrée (kick=1 → tirage immédiat). */
function mountSession() {
  const utils = render(
    <AppProvider>
      <Review kick={1} visible />
    </AppProvider>,
  );
  const card = utils.container.querySelector<HTMLElement>('.cardflip');
  if (!card) throw new Error('carte introuvable — la session n’a pas démarré');
  return { ...utils, card };
}

const isFlipped = (card: HTMLElement) => card.classList.contains('flipped');

beforeEach(() => localStorage.clear());
afterEach(cleanup);

// Régression : la carte a role="button" et son propre onKeyDown, et Review pose
// aussi un keydown global sur window. Sans déduplication, Espace/Entrée carte
// focalisée déclenchaient les deux → double toggle, la carte ne bougeait pas.
describe('clavier pendant la session', () => {
  it('Espace retourne la carte une seule fois quand elle est focalisée', () => {
    const { card } = mountSession();
    card.focus();
    expect(isFlipped(card)).toBe(false);
    fireEvent.keyDown(card, { key: ' ', code: 'Space' });
    expect(isFlipped(card)).toBe(true);
    fireEvent.keyDown(card, { key: ' ', code: 'Space' });
    expect(isFlipped(card)).toBe(false);
  });

  it('Entrée retourne la carte une seule fois quand elle est focalisée', () => {
    const { card } = mountSession();
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(isFlipped(card)).toBe(true);
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(isFlipped(card)).toBe(false);
  });

  it('Espace retourne la carte même sans focus sur elle (raccourci global)', () => {
    const { card } = mountSession();
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    expect(isFlipped(card)).toBe(true);
  });

  it('Entrée sur un bouton interne (surligneur) ne retourne pas la carte', () => {
    const { card, container } = mountSession();
    const flagBtn = container.querySelector<HTMLElement>('.flagbtn');
    if (!flagBtn) throw new Error('surligneur introuvable');
    flagBtn.focus();
    fireEvent.keyDown(flagBtn, { key: 'Enter' });
    expect(isFlipped(card)).toBe(false);
  });

  it('les flèches notent la carte retournée (→ passe à la suivante)', () => {
    const { card, container } = mountSession();
    const count = () => container.querySelector('.session-count')?.textContent;
    const before = count();
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(isFlipped(card)).toBe(false);
    expect(count()).not.toBe(before);
  });
});
