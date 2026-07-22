import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Settings({ open, onClose }: Props) {
  const { st, patchSettings, exportState, importState, reset } = useApp();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    setConfirmReset(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `oxford3000-progression-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importState(String(reader.result));
      setFeedback(ok
        ? { ok: true, msg: 'Progression importée.' }
        : { ok: false, msg: 'Fichier invalide : rien n’a été modifié.' });
    };
    reader.readAsText(f);
  };

  const step = (key: 'dailyGoal' | 'sessionSize', delta: number, min: number, max: number) => {
    const next = Math.min(max, Math.max(min, st.settings[key] + delta));
    patchSettings({ [key]: next });
  };

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Réglages" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden />
        <h2>Réglages</h2>

        <div className="sheet-row">
          <div>
            <div className="lab">Objectif quotidien</div>
            <div className="sub">Sert à l’estimation tant que ton rythme réel est inconnu</div>
          </div>
          <div className="stepper">
            <button aria-label="Diminuer l’objectif" onClick={() => step('dailyGoal', -5, 5, 100)}>−</button>
            <span className="val">{st.settings.dailyGoal}</span>
            <button aria-label="Augmenter l’objectif" onClick={() => step('dailyGoal', +5, 5, 100)}>+</button>
          </div>
        </div>

        <div className="sheet-row">
          <div>
            <div className="lab">Taille de session</div>
            <div className="sub">Nombre de mots tirés par défaut</div>
          </div>
          <div className="stepper">
            <button aria-label="Diminuer la taille" onClick={() => step('sessionSize', -5, 5, 30)}>−</button>
            <span className="val">{st.settings.sessionSize}</span>
            <button aria-label="Augmenter la taille" onClick={() => step('sessionSize', +5, 5, 30)}>+</button>
          </div>
        </div>

        <div className="sheet-row">
          <div>
            <div className="lab">Prononcer automatiquement</div>
            <div className="sub">Lit chaque mot à voix haute quand la carte apparaît</div>
          </div>
          <button
            className={`switch ${st.settings.autoAudio ? 'on' : ''}`}
            role="switch"
            aria-checked={st.settings.autoAudio}
            aria-label="Prononcer automatiquement"
            onClick={() => patchSettings({ autoAudio: !st.settings.autoAudio })}
          />
        </div>

        <div className="sheet-row">
          <div>
            <div className="lab">Sauvegarde</div>
            <div className="sub">La progression reste sur cet appareil ; exporte-la pour la transférer</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" style={{ minHeight: 40, padding: '6px 16px' }} onClick={download}>Exporter</button>
            <button className="btn ghost" style={{ minHeight: 40, padding: '6px 16px' }} onClick={() => fileRef.current?.click()}>Importer</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="visually-hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
              aria-label="Importer une progression"
            />
          </div>
        </div>
        {feedback && <div className={`filefeedback ${feedback.ok ? 'ok' : 'err'}`}>{feedback.msg}</div>}

        <div className="sheet-row">
          <div>
            <div className="lab">Remise à zéro</div>
            <div className="sub">Efface toute la progression, pas les mots</div>
          </div>
          <button
            className="btn danger"
            style={{ minHeight: 40, padding: '6px 16px' }}
            onClick={() => {
              if (!confirmReset) { setConfirmReset(true); return; }
              reset();
              setConfirmReset(false);
            }}
          >
            {confirmReset ? 'Confirmer l’effacement' : 'Réinitialiser'}
          </button>
        </div>

        <p className="hist" style={{ marginTop: 14 }}>
          Liste : The Oxford 3000™ (American English), © Oxford University Press.
          Prononciations, traductions et exemples fournis pour l’apprentissage ;
          une coquille se corrige dans <code>src/data/words.json</code>.
        </p>
      </div>
    </div>
  );
}
