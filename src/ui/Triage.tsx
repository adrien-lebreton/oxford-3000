import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as RMouseEvent, PointerEvent as RPointerEvent } from 'react';
import type { Level } from '../core/types';
import { triagePool } from '../core/draw';
import { getWP } from '../core/store';
import { canSpeak, speak } from '../core/audio';
import { fmtInt, useApp } from '../state';
import { IconCheck, IconSpeaker } from './icons';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

/** Profondeur de la pile des derniers tris corrigeables. */
const HISTORY_MAX = 15;

/**
 * Tri rapide : marquer d'un geste les mots déjà connus, un par un,
 * pour solder la phase de démarrage sans passer par des sessions.
 */
export function Triage({ visible }: { visible: boolean }) {
  const { words, st, gen, status } = useApp();
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set());
  // Pile des derniers mots triés (ids, le plus récent en tête) : chaque
  // entrée reste corrigeable individuellement, sans défaire les suivantes.
  const [history, setHistory] = useState<string[]>([]);
  // Tous les mots triés cette session (non plafonné), pour le compteur.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());

  // L'état de session ne survit pas à un remplacement en bloc de la
  // progression (remise à zéro, import, fusion de sync) : pas de pile fantôme.
  useEffect(() => {
    setHistory([]);
    setSkipped(new Set());
    setTouched(new Set());
  }, [gen]);

  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const freshByLevel = useMemo(() => {
    const acc: Record<string, number> = { all: 0 };
    for (const l of LEVELS) acc[l] = 0;
    for (const w of words) {
      const wp = st.words[w.id];
      if (wp === undefined || wp.s === 0) { acc.all++; acc[w.level]++; }
    }
    return acc;
  }, [words, st]);

  const pool = useMemo(() => triagePool(words, st, level, skipped), [words, st, level, skipped]);
  const current = pool[0];

  // Dérivé de l'état réel : reste juste même si un statut change ailleurs.
  const sessionCount = useMemo(() => {
    let n = 0;
    for (const id of touched) if (getWP(st, id).s === 2) n++;
    return n;
  }, [touched, st]);

  const push = useCallback((id: string) => {
    setHistory((h) => [id, ...h.filter((x) => x !== id)].slice(0, HISTORY_MAX));
    setTouched((t) => (t.has(id) ? t : new Set(t).add(id)));
  }, []);

  const mark = useCallback(() => {
    if (!current) return;
    status(current.id, 2);
    push(current.id);
  }, [current, status, push]);

  const skip = useCallback(() => {
    if (!current) return;
    setSkipped((s) => new Set(s).add(current.id));
    push(current.id);
  }, [current, push]);

  /** Corrige une entrée de la pile : connu ↔ passé, sans toucher aux autres. */
  const toggle = useCallback((id: string) => {
    if (getWP(st, id).s === 2) {
      // Marqué connu par erreur → repasse en « passé » : statut inchangé (0),
      // exclu de la file pour cette session, il reviendra à la prochaine visite.
      status(id, 0);
      setSkipped((s) => new Set(s).add(id));
    } else {
      status(id, 2);
      setSkipped((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }, [st, status]);

  const undo = useCallback(() => {
    if (history.length > 0) toggle(history[0]);
  }, [history, toggle]);

  // Glisser-souris = défilement de la bande, comme le geste tactile natif
  // (même convention que le swipe des rangées de la page Mots).
  const drag = useRef<{ id: number; x: number; left: number; engaged: boolean } | null>(null);
  const suppressClick = useRef(false);

  const onStripPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, left: e.currentTarget.scrollLeft, engaged: false };
    suppressClick.current = false;
  };

  const onStripPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    // Bouton relâché hors de la bande : le pointerup ne nous est jamais parvenu.
    if (e.buttons === 0) { drag.current = null; return; }
    const dx = e.clientX - d.x;
    if (!d.engaged) {
      if (Math.abs(dx) < 5) return; // simple clic : on ne bouge pas
      d.engaged = true;
      suppressClick.current = true;
      try { e.currentTarget.setPointerCapture(d.id); } catch { /* pointeur déjà relâché */ }
    }
    e.currentTarget.scrollLeft = d.left - dx;
  };

  const onStripPointerEnd = (e: RPointerEvent<HTMLDivElement>) => {
    if (drag.current && e.pointerId === drag.current.id) drag.current = null;
  };

  // Après un glissement, le relâcher ne doit pas corriger une pastille.
  const onStripClickCapture = (e: RMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      // Un bouton focalisé (pastille de la pile, gros boutons) garde son
      // activation native Entrée/Espace ; on ne détourne que hors bouton.
      const onButton = e.target instanceof Element && e.target.closest('button') !== null;
      if (e.key === 'ArrowRight') { e.preventDefault(); mark(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); skip(); }
      else if (!onButton && e.key === 'Enter') { e.preventDefault(); mark(); }
      else if (!onButton && (e.key === ' ' || e.code === 'Space')) { e.preventDefault(); skip(); }
      else if (e.key === 'u' && !e.repeat) undo();
      else if (e.key === 'p' && current) speak(current.word);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, mark, skip, undo, current]);

  return (
    <section aria-label="Tri rapide des mots connus">
      <div className="chiprow" role="radiogroup" aria-label="Niveau à trier" style={{ marginBottom: 12 }}>
        <button className={`chip ${level === 'all' ? 'on' : ''}`} role="radio" aria-checked={level === 'all'} onClick={() => setLevel('all')}>
          Tous <span className="n">{fmtInt(freshByLevel.all)}</span>
        </button>
        {LEVELS.map((l) => (
          <button key={l} className={`chip ${level === l ? 'on' : ''}`} role="radio" aria-checked={level === l} onClick={() => setLevel(l)}>
            {l} <span className="n">{fmtInt(freshByLevel[l])}</span>
          </button>
        ))}
      </div>

      <div className="list-meta">
        <span>{fmtInt(pool.length)} {pool.length > 1 ? 'mots à trier' : 'mot à trier'}</span>
        {sessionCount > 0 && <span className="triage-session">✓ {fmtInt(sessionCount)} marqués connus</span>}
      </div>

      {current ? (
        <>
          <div className="panel triage-card">
            <div className="card-level" aria-hidden>
              <span className={`level-chip ${current.level.toLowerCase()}`}>{current.level}</span>
            </div>
            <div className="card-word triage-word" lang="en">{current.word}</div>
            {current.note && <div className="card-note" lang="en">({current.note})</div>}
            <div className="card-pos">{current.senses.map((s) => s.pos).join(' · ')}</div>
            <div className="card-ipa" lang="en">{current.ipa}</div>
            <div className="triage-fr">{current.fr}</div>
            {canSpeak() && (
              <button
                className="speakbtn"
                aria-label="Écouter la prononciation"
                onClick={() => speak(current.word)}
              >
                <IconSpeaker />
              </button>
            )}
          </div>

          <div className="grade-row">
            <button className="grade neutral" onClick={skip}>Passer →</button>
            <button className="grade yes" onClick={mark}>
              <IconCheck size={19} /> Je le connais
            </button>
          </div>
        </>
      ) : (
        <div className="panel empty">
          <div className="t">
            {freshByLevel[level === 'all' ? 'all' : level] === 0
              ? 'Tout est trié ici. Beau travail.'
              : 'Tu as passé tous les mots restants.'}
          </div>
          <div className="s">
            {level !== 'all' && freshByLevel.all > 0
              ? 'Change de niveau pour continuer le tri.'
              : 'Les mots passés reviendront à ta prochaine visite.'}
          </div>
        </div>
      )}

      {history.length > 0 ? (
        <div className="hist">
          <div className="hist-cap" id="hist-cap">Un mot mal trié ? Touche-le pour corriger.</div>
          <div
            className="hist-strip"
            role="group"
            aria-labelledby="hist-cap"
            onPointerDown={onStripPointerDown}
            onPointerMove={onStripPointerMove}
            onPointerUp={onStripPointerEnd}
            onPointerCancel={onStripPointerEnd}
            onClickCapture={onStripClickCapture}
          >
            {history.map((id) => {
              const w = byId.get(id);
              const s = getWP(st, id).s;
              // Un mot repris entre-temps par une vraie révision (s=1) ne
              // reflète plus une décision de tri : sa pastille disparaît.
              if (!w || s === 1) return null;
              const known = s === 2;
              return (
                <button
                  key={id}
                  className={`hist-chip ${known ? 'known' : ''}`}
                  title={w.fr}
                  aria-label={`${w.word}, ${w.fr} — ${known ? 'marqué connu, corriger en passé' : 'passé, corriger en connu'}`}
                  onClick={() => toggle(id)}
                >
                  {known ? <IconCheck size={14} /> : <span className="arr" aria-hidden>→</span>}
                  <span lang="en">{w.word}</span>
                  <span className="fr">{w.fr}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : current ? (
        <div className="triage-hint">
          <span className="keyhint">→ je connais · ← passer · U corriger · P écouter</span>
        </div>
      ) : null}
    </section>
  );
}
