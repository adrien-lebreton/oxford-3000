import { describe, expect, test } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Card } from './Card';
import type { Word } from '../core/types';

const word: Word = {
  id: 'abandon',
  word: 'abandon',
  note: null,
  hom: null,
  senses: [{ pos: 'verb', level: 'B2' }],
  level: 'B2',
  ord: 1,
  ipa: '/əˈbændən/',
  fr: 'abandonner',
  def: 'to leave somebody, especially somebody you are responsible for',
  ex: 'The baby had been abandoned by its mother.',
};

const noop = () => {};

function render(flipped: boolean): { front: string; back: string } {
  const html = renderToString(
    <Card word={word} flipped={flipped} onFlip={noop} flagged={false} onToggleFlag={noop} autoAudio={false} />
  );
  const front = html.match(/<div[^>]*class="face panel"[^>]*>/)?.[0];
  const back = html.match(/<div[^>]*class="face back panel"[^>]*>/)?.[0];
  if (!front || !back) throw new Error(`faces introuvables dans : ${html}`);
  return { front, back };
}

describe('Card — la face masquée est inerte (ni focus ni lecteur d’écran)', () => {
  test('recto visible : le verso est inert, pas le recto', () => {
    const { front, back } = render(false);
    expect(back).toMatch(/\binert\b/);
    expect(front).not.toMatch(/\binert\b/);
  });

  test('carte retournée : le recto est inert, pas le verso', () => {
    const { front, back } = render(true);
    expect(front).toMatch(/\binert\b/);
    expect(back).not.toMatch(/\binert\b/);
  });
});
