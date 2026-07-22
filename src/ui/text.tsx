import type { ReactNode } from 'react';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Surligne le mot (ou une forme fléchie) dans la phrase d'exemple. */
export function highlightExample(ex: string, headword: string): ReactNode {
  // « a, an » → on tente chaque variante ; sinon radical de 4 lettres
  const variants = headword.toLowerCase().split(',').map((v) => v.trim()).filter(Boolean);
  const first = variants[0] ?? '';
  const stem = first.replace(/[^a-z' -]/g, '').slice(0, 4);
  const patterns = [
    ...variants.map((v) => `${escapeRe(v)}\\w*`),
    stem.length >= 3 ? `${escapeRe(stem)}\\w*` : null,
  ].filter((p): p is string => p !== null);

  for (const p of patterns) {
    const m = ex.match(new RegExp(`\\b(${p})`, 'i'));
    if (m && m.index !== undefined) {
      return (
        <>
          {ex.slice(0, m.index)}
          <span className="exw">{m[1]}</span>
          {ex.slice(m.index + m[1].length)}
        </>
      );
    }
  }
  return ex;
}
