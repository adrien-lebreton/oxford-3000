import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Level } from '../core/types';
import { triagePool } from '../core/draw';
import { canSpeak, speak } from '../core/audio';
import { fmtInt, useApp } from '../state';
import { IconCheck, IconSpeaker } from './icons';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

/**
 * Tri rapide : marquer d'un geste les mots déjà connus, un par un,
 * pour solder la phase de démarrage sans passer par des sessions.
 */
export function Triage({ visible }: { visible: boolean }) {
  const { words, st, status } = useApp();
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(() => new Set());
  const [sessionCount, setSessionCount] = useState(0);
  const [last, setLast] = useState<{ id: string; word: string } | null>(null);

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

  const mark = useCallback(() => {
    if (!current) return;
    status(current.id, 2);
    setSessionCount((c) => c + 1);
    setLast({ id: current.id, word: current.word });
  }, [current, status]);

  const skip = useCallback(() => {
    if (!current) return;
    setSkipped((s) => new Set(s).add(current.id));
  }, [current]);

  const undo = useCallback(() => {
    if (!last) return;
    status(last.id, 0);
    setSessionCount((c) => Math.max(0, c - 1));
    setLast(null);
  }, [last, status]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); mark(); }
      else if (e.key === 'ArrowLeft' || e.key === ' ' || e.code === 'Space') { e.preventDefault(); skip(); }
      else if (e.key === 'u') undo();
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

          <div className="undo-row">
            {last ? (
              <>
                <span>« {last.word} » marqué connu</span>
                <button onClick={undo}>Annuler</button>
              </>
            ) : (
              <span className="keyhint">→ je connais · ← passer · U annuler · P écouter</span>
            )}
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
    </section>
  );
}
