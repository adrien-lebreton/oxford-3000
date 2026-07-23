import { useEffect } from 'react';
import type { Word } from '../core/types';
import { canSpeak, speak } from '../core/audio';
import { IconHighlighter, IconSpeaker } from './icons';
import { highlightExample } from './text';

interface Props {
  word: Word;
  flipped: boolean;
  onFlip: () => void;
  flagged: boolean;
  onToggleFlag: () => void;
  autoAudio: boolean;
}

export function Card({ word, flipped, onFlip, flagged, onToggleFlag, autoAudio }: Props) {
  useEffect(() => {
    if (autoAudio) speak(word.word);
  }, [word.id, autoAudio, word.word]);

  const levels = [...new Set(word.senses.map((s) => s.level))];

  return (
    <div className="card3d">
      <div
        className={`cardflip ${flipped ? 'flipped' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={flipped ? 'Carte retournée, réponds ci-dessous' : `Retourner la carte ${word.word}`}
        onClick={onFlip}
        onKeyDown={(e) => {
          // Le keydown d'un bouton interne (surligneur, audio) bulle jusqu'ici :
          // le laisser passer pour garder l'activation native Entrée/Espace.
          if (e.target instanceof Element && e.target.closest('button')) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip(); }
        }}
      >
        {/* recto : l'entrée du dictionnaire, côté anglais */}
        <div className="face panel" style={{ position: 'relative' }} aria-hidden={flipped}>
          <div className="card-level" aria-hidden>
            {levels.map((l) => <span key={l} className={`level-chip ${l.toLowerCase()}`}>{l}</span>)}
          </div>
          <div className="card-flag">
            <button
              className={`flagbtn ${flagged ? 'on' : ''}`}
              aria-label={flagged ? 'Retirer le surlignage « difficile »' : 'Marquer comme difficile'}
              aria-pressed={flagged}
              onClick={(e) => { e.stopPropagation(); onToggleFlag(); }}
            >
              <IconHighlighter />
            </button>
          </div>
          <div className="card-word" lang="en">
            <span className={flagged ? 'swipe' : ''}>{word.word}</span>
          </div>
          {word.note && <div className="card-note" lang="en">({word.note})</div>}
          <div className="card-pos">{word.senses.map((s) => s.pos).join(' · ')}</div>
          <div className="card-ipa" lang="en">{word.ipa}</div>
          {canSpeak() && (
            <button
              className="speakbtn"
              aria-label="Écouter la prononciation"
              onClick={(e) => { e.stopPropagation(); speak(word.word); }}
            >
              <IconSpeaker />
            </button>
          )}
          <div className="taphint">Touche la carte pour la retourner</div>
        </div>

        {/* verso : traduction, définition, exemples (un par sens) */}
        <div className="face back panel" aria-hidden={!flipped}>
          <div className="back-inner">
            <div className="card-back-word" lang="en">{word.word} {word.ipa}</div>
            <div className="card-fr">{word.fr}</div>
            <div className="card-def" lang="en">{word.def}</div>
            <div className="card-ex" lang="en">
              {highlightExample(word.ex, word.word)}
              {canSpeak() && (
                <>
                  {' '}
                  <button
                    className="iconbtn"
                    style={{ width: 32, height: 32, verticalAlign: 'middle' }}
                    aria-label="Écouter la phrase d’exemple"
                    onClick={(e) => { e.stopPropagation(); speak(word.ex); }}
                  >
                    <IconSpeaker size={17} />
                  </button>
                </>
              )}
            </div>
            {word.alt?.map((a, i) => (
              <div className="alt-block" key={i}>
                <div className="alt-head">
                  <span className="pos">{a.pos}</span>
                  <span lang="en">{a.def}</span>
                </div>
                <div className="alt-ex" lang="en">
                  {highlightExample(a.ex, word.word)}
                  {canSpeak() && (
                    <>
                      {' '}
                      <button
                        className="iconbtn"
                        style={{ width: 28, height: 28, verticalAlign: 'middle' }}
                        aria-label="Écouter cet exemple"
                        onClick={(e) => { e.stopPropagation(); speak(a.ex); }}
                      >
                        <IconSpeaker size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
