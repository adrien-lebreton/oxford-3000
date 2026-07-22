import { useEffect, useMemo, useRef, useState } from 'react';
import type { Level, Status, Word } from '../core/types';
import { getWP } from '../core/store';
import { fmtInt, useApp } from '../state';
import { IconSearch } from './icons';

const PAGE = 150;
const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const STATUS_LABEL: Record<Status, string> = { 0: 'Nouveau', 1: 'En cours', 2: 'Connu' };
const STATUS_CLASS: Record<Status, string> = { 0: 'fresh', 1: 'learning', 2: 'known' };

interface Props {
  openWord: (w: Word) => void;
  /** Incrémenté quand l'accueil demande la vue « difficiles ». */
  flaggedKick: number;
}

export function WordList({ openWord, flaggedKick }: Props) {
  const { words, st, bulk } = useApp();
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<Level | 'all'>('all');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (flaggedKick > 0) {
      setFlaggedOnly(true);
      setLevel('all');
      setStatus('all');
      setQ('');
    }
  }, [flaggedKick]);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return words.filter((w) => {
      const wp = getWP(st, w.id);
      if (level !== 'all' && w.level !== level) return false;
      if (status !== 'all' && wp.s !== status) return false;
      if (flaggedOnly && !wp.flag) return false;
      if (nq && !w.word.toLowerCase().includes(nq) && !norm(w.fr).includes(nq)) return false;
      return true;
    });
  }, [words, st, q, level, status, flaggedOnly]);

  useEffect(() => {
    setVisible(PAGE);
    setConfirming(false);
  }, [q, level, status, flaggedOnly]);

  const notKnown = useMemo(
    () => filtered.filter((w) => getWP(st, w.id).s !== 2).length,
    [filtered, st],
  );

  const onBulk = () => {
    if (!confirming) {
      setConfirming(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 3500);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirming(false);
    bulk(filtered.map((w) => w.id));
  };

  return (
    <section aria-label="Liste des mots">
      <div className="searchbox">
        <IconSearch />
        <input
          type="search"
          placeholder="Chercher un mot ou une traduction…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Rechercher"
        />
      </div>

      <div className="filters">
        <div className="chiprow" role="radiogroup" aria-label="Filtrer par niveau">
          <button className={`chip ${level === 'all' ? 'on' : ''}`} role="radio" aria-checked={level === 'all'} onClick={() => setLevel('all')}>Tous niveaux</button>
          {LEVELS.map((l) => (
            <button key={l} className={`chip ${level === l ? 'on' : ''}`} role="radio" aria-checked={level === l} onClick={() => setLevel(l)}>{l}</button>
          ))}
        </div>
        <div className="chiprow" role="radiogroup" aria-label="Filtrer par statut">
          <button className={`chip ${status === 'all' ? 'on' : ''}`} role="radio" aria-checked={status === 'all'} onClick={() => setStatus('all')}>Tous statuts</button>
          {([2, 1, 0] as Status[]).map((s) => (
            <button key={s} className={`chip ${status === s ? 'on' : ''}`} role="radio" aria-checked={status === s} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
          <button
            className={`chip hl-chip ${flaggedOnly ? 'on' : ''}`}
            aria-pressed={flaggedOnly}
            onClick={() => setFlaggedOnly((f) => !f)}
          >
            <span className={flaggedOnly ? 'swipe' : ''}>Difficiles</span>
          </button>
        </div>
      </div>

      <div className="list-meta">
        <span>{fmtInt(filtered.length)} {filtered.length > 1 ? 'mots' : 'mot'}</span>
        {notKnown > 0 && (
          <button className={`bulkbtn ${confirming ? 'confirm' : ''}`} onClick={onBulk}>
            {confirming ? `Confirmer : marquer ${fmtInt(notKnown)} mots connus` : 'Tout marquer connu'}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="panel empty">
          <div className="t">Aucune entrée ne correspond.</div>
          <div className="s">Essaie une autre orthographe, ou retire un filtre.</div>
        </div>
      ) : (
        <div className="panel wordlist">
          {filtered.slice(0, visible).map((w) => {
            const wp = getWP(st, w.id);
            return (
              <button className="wordrow" key={w.id} onClick={() => openWord(w)}>
                <span className="top">
                  <span className="w" lang="en">
                    <span className={wp.flag ? 'swipe' : ''}>{w.word}</span>
                    {w.note ? <span className="card-note"> ({w.note})</span> : null}
                  </span>
                  <span className="ipa" lang="en">{w.ipa}</span>
                </span>
                <span className="fr">{w.fr}</span>
                <span className="status">
                  <span className={`pill ${STATUS_CLASS[wp.s]}`}>{STATUS_LABEL[wp.s]}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {filtered.length > visible && (
        <button className="btn ghost morebtn" onClick={() => setVisible((v) => v + 300)}>
          Afficher plus ({fmtInt(filtered.length - visible)} restants)
        </button>
      )}
    </section>
  );
}
