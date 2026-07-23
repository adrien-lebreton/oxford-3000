import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Level, Word } from '../core/types';
import type { Mode } from '../core/draw';
import { MODE_LABELS, draw, pool } from '../core/draw';
import { getWP } from '../core/store';
import { speak } from '../core/audio';
import { fmtInt, useApp } from '../state';
import { Card } from './Card';
import { IconCheck, IconX } from './icons';

const SIZES = [5, 10, 15, 20, 30];
const MODES: Mode[] = ['new', 'unknown', 'difficult', 'all'];
const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

type Phase = 'setup' | 'card' | 'done';

interface Props {
  /** Incrémenté par le CTA de l'accueil pour démarrer une session directement. */
  kick: number;
  visible: boolean;
}

export function Review({ kick, visible }: Props) {
  const { words, st, answer, flag, patchSettings } = useApp();
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('new');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [deck, setDeck] = useState<Word[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ id: string; ok: boolean }[]>([]);

  const size = st.settings.sessionSize;
  const poolCounts = useMemo(
    () => Object.fromEntries(MODES.map((m) => [m, pool(words, st, m, level).length])) as Record<Mode, number>,
    [words, st, level],
  );
  const levelCounts = useMemo(() => {
    const acc = { all: pool(words, st, mode).length } as Record<Level | 'all', number>;
    for (const l of LEVELS) acc[l] = pool(words, st, mode, l).length;
    return acc;
  }, [words, st, mode]);

  const start = useCallback((m: Mode, n: number) => {
    // Repli en cascade (surtout pour le CTA de l'accueil) : du plus frais au plus large
    const fallback = ([m, 'unknown', 'all'] as Mode[])
      .find((cand) => pool(words, st, cand, level).length > 0) ?? 'all';
    const d = draw(words, st, fallback, n, { level });
    if (d.length === 0) return;
    setMode(fallback);
    setDeck(d);
    setIdx(0);
    setFlipped(false);
    setResults([]);
    setPhase('card');
  }, [words, st, level]);

  // CTA de l'accueil → démarrage immédiat
  useEffect(() => {
    if (kick > 0) start(mode, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kick]);

  const current: Word | undefined = deck[idx];

  const grade = useCallback((ok: boolean) => {
    if (!current) return;
    answer(current.id, ok);
    const next = [...results, { id: current.id, ok }];
    setResults(next);
    setFlipped(false);
    if (idx + 1 < deck.length) setIdx(idx + 1);
    else setPhase('done');
  }, [current, answer, results, idx, deck.length]);

  // Raccourcis clavier pendant la session
  useEffect(() => {
    if (!visible || phase !== 'card') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      // Un contrôle focalisé (« Pas encore », « Je connais », surligneur, carte…)
      // gère lui-même Entrée/Espace ; on ne détourne ces touches qu'en dehors,
      // sinon double action (la carte role="button" retournerait deux fois).
      const onButton = e.target instanceof Element && e.target.closest('button, [role="button"]') !== null;
      if (!onButton && (e.key === ' ' || e.key === 'Enter' || e.code === 'Space')) { e.preventDefault(); setFlipped((f) => !f); }
      else if (flipped && e.key === 'ArrowLeft') grade(false);
      else if (flipped && e.key === 'ArrowRight') grade(true);
      else if (e.key === 'f' && current) flag(current.id);
      else if (e.key === 'p' && current) speak(current.word);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, phase, flipped, grade, current, flag]);

  /* ---------- écrans ---------- */

  if (phase === 'setup' || !current) {
    return (
      <section className="panel review-setup" aria-label="Préparer une session">
        <div>
          <div className="setup-label">Tirage</div>
          <div className="chiprow" role="radiogroup" aria-label="Mode de tirage">
            {MODES.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                className={`chip ${mode === m ? 'on' : ''} ${m === 'difficult' ? 'hl-chip' : ''}`}
                onClick={() => setMode(m)}
              >
                {MODE_LABELS[m]} <span className="n">{fmtInt(poolCounts[m])}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="setup-label">Niveau</div>
          <div className="chiprow" role="radiogroup" aria-label="Niveau">
            <button
              role="radio"
              aria-checked={level === 'all'}
              className={`chip ${level === 'all' ? 'on' : ''}`}
              onClick={() => setLevel('all')}
            >
              Tous <span className="n">{fmtInt(levelCounts.all)}</span>
            </button>
            {LEVELS.map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={level === l}
                className={`chip ${level === l ? 'on' : ''}`}
                onClick={() => setLevel(l)}
              >
                {l} <span className="n">{fmtInt(levelCounts[l])}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="setup-label">Nombre de mots</div>
          <div className="chiprow" role="radiogroup" aria-label="Nombre de mots">
            {SIZES.map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={size === n}
                className={`chip ${size === n ? 'on' : ''}`}
                onClick={() => patchSettings({ sessionSize: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        {poolCounts[mode] === 0 ? (
          <div className="empty">
            <div className="t">Rien à tirer ici.</div>
            <div className="s">
              {mode === 'difficult' && level === 'all'
                ? 'Aucun mot n’est marqué difficile. Le surligneur est sur chaque carte.'
                : level !== 'all'
                  ? `Ce tirage est vide pour le niveau ${level}.`
                  : 'Ce tirage est vide pour le moment.'}
            </div>
          </div>
        ) : (
          <button className="btn big" onClick={() => start(mode, size)}>
            Tirer {Math.min(size, poolCounts[mode])} {Math.min(size, poolCounts[mode]) > 1 ? 'mots' : 'mot'}
          </button>
        )}
      </section>
    );
  }

  if (phase === 'done') {
    const good = results.filter((r) => r.ok).length;
    const missedWords = results.filter((r) => !r.ok)
      .map((r) => deck.find((w) => w.id === r.id))
      .filter((w): w is Word => Boolean(w));
    return (
      <section className="panel done" aria-label="Fin de session">
        <div className="done-score">
          {fmtInt(good)}<span className="total"> / {fmtInt(results.length)}</span>
        </div>
        <div className="done-sub">
          {good === results.length
            ? 'Sans faute. La liste recule.'
            : `${fmtInt(missedWords.length)} ${missedWords.length > 1 ? 'mots à revoir' : 'mot à revoir'}. Ils sont notés.`}
        </div>
        {missedWords.length > 0 && (
          <div className="missed-list">
            {missedWords.map((w) => (
              <div className="missed-item" key={w.id}>
                <span className="w" lang="en">{w.word}</span>
                <span className="f">{w.fr}</span>
              </div>
            ))}
          </div>
        )}
        <div className="cta-row">
          {missedWords.length > 0 && (
            <button
              className="btn big"
              onClick={() => {
                setDeck(missedWords);
                setIdx(0);
                setFlipped(false);
                setResults([]);
                setPhase('card');
              }}
            >
              Rejouer les {fmtInt(missedWords.length)} ratés
            </button>
          )}
          <button className={`btn big ${missedWords.length > 0 ? 'ghost' : ''}`} onClick={() => start(mode, size)}>
            Nouvelle session
          </button>
          <button className="btn ghost big" onClick={() => setPhase('setup')}>
            Changer le tirage
          </button>
        </div>
      </section>
    );
  }

  const wp = getWP(st, current.id);

  return (
    <section aria-label="Session de révision">
      <div className="session-top">
        <span className="session-count">
          {idx + 1} / {deck.length}{level !== 'all' ? ` · ${level}` : ''}
        </span>
        <div className="session-bar" aria-hidden>
          <div style={{ width: `${((idx + (flipped ? 0.5 : 0)) / deck.length) * 100}%` }} />
        </div>
        <button className="quitbtn" onClick={() => setPhase('setup')}>Quitter</button>
      </div>

      <Card
        word={current}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        flagged={wp.flag}
        onToggleFlag={() => flag(current.id)}
        autoAudio={st.settings.autoAudio}
      />

      {flipped ? (
        <div className="grade-row">
          <button className="grade no" onClick={() => grade(false)}>
            <IconX size={19} /> Pas encore
          </button>
          <button className="grade yes" onClick={() => grade(true)}>
            <IconCheck size={19} /> Je connais
          </button>
        </div>
      ) : (
        <div className="taphint keyhint" style={{ textAlign: 'center', marginTop: 14 }}>
          Espace pour retourner · ← je ne sais pas · → je connais
        </div>
      )}
    </section>
  );
}
