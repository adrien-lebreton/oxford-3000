import { useEffect } from 'react';
import type { Status, Word } from '../core/types';
import { getWP } from '../core/store';
import { canSpeak, speak } from '../core/audio';
import { fmtDate, fmtInt, useApp } from '../state';
import { IconSpeaker } from './icons';
import { highlightExample } from './text';

interface Props {
  word: Word | null;
  onClose: () => void;
}

const STATUSES: { v: Status; label: string }[] = [
  { v: 0, label: 'Nouveau' },
  { v: 1, label: 'En cours' },
  { v: 2, label: 'Connu' },
];

export function WordSheet({ word, onClose }: Props) {
  const { st, status, flag } = useApp();

  useEffect(() => {
    if (!word) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [word, onClose]);

  if (!word) return null;
  const wp = getWP(st, word.id);
  const revs = st.events.filter((e) => e[0] === word.id && e[3] === 'r');

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Fiche du mot ${word.word}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
          <div className="sheet-entry-word" lang="en">
            <span className={wp.flag ? 'swipe' : ''}>{word.word}</span>
            {word.note && <span className="card-note"> ({word.note})</span>}
          </div>
          {canSpeak() && (
            <button className="speakbtn" style={{ marginTop: 0, flexShrink: 0 }} aria-label="Écouter la prononciation" onClick={() => speak(word.word)}>
              <IconSpeaker />
            </button>
          )}
        </div>

        <div className="entry-meta" lang="en">{word.ipa}</div>

        <div className="senses" style={{ marginTop: 10 }}>
          {word.senses.map((s, i) => (
            <span className="sense" key={i}>
              <span className="pos">{s.pos}</span>
              <span className={`level-chip ${s.level.toLowerCase()}`} style={{ padding: '0 7px' }}>{s.level}</span>
            </span>
          ))}
        </div>

        <div className="card-fr" style={{ marginTop: 14 }}>{word.fr}</div>
        <div className="card-def" lang="en" style={{ marginTop: 4 }}>{word.def}</div>
        <p className="entry-ex" lang="en">
          {highlightExample(word.ex, word.word)}
          {canSpeak() && (
            <button
              className="iconbtn"
              style={{ width: 30, height: 30, verticalAlign: 'middle', marginLeft: 6 }}
              aria-label="Écouter la phrase d’exemple"
              onClick={() => speak(word.ex)}
            >
              <IconSpeaker size={16} />
            </button>
          )}
        </p>
        {word.alt?.map((a, i) => (
          <div className="alt-block sheet-alt" key={i}>
            <div className="alt-head">
              <span className="pos">{a.pos}</span>
              <span lang="en">{a.def}</span>
            </div>
            <div className="alt-ex" lang="en">
              {highlightExample(a.ex, word.word)}
              {canSpeak() && (
                <button
                  className="iconbtn"
                  style={{ width: 28, height: 28, verticalAlign: 'middle', marginLeft: 6 }}
                  aria-label="Écouter cet exemple"
                  onClick={() => speak(a.ex)}
                >
                  <IconSpeaker size={15} />
                </button>
              )}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 10 }}>
          <div className="sheet-row">
            <span className="lab">Statut</span>
            <div className="seg" role="radiogroup" aria-label="Statut du mot">
              {STATUSES.map(({ v, label }) => (
                <button key={v} role="radio" aria-checked={wp.s === v} className={wp.s === v ? 'on' : ''} onClick={() => status(word.id, v)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="sheet-row">
            <div>
              <div className="lab">Difficile</div>
              <div className="sub">Surligné, prioritaire dans le tirage « Difficiles »</div>
            </div>
            <button
              className={`switch ${wp.flag ? 'on' : ''}`}
              role="switch"
              aria-checked={wp.flag}
              aria-label="Marquer comme difficile"
              onClick={() => flag(word.id)}
            />
          </div>

          <div className="sheet-row">
            <span className="hist">
              {revs.length === 0
                ? 'Jamais révisé pour l’instant.'
                : <>Révisé {fmtInt(revs.length)} fois · {fmtInt(wp.lapses)} {wp.lapses > 1 ? 'oublis' : 'oubli'}
                  {wp.last ? <> · dernière fois le {fmtDate(wp.last)}</> : null}</>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
