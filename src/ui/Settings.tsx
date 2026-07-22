import { useEffect, useRef, useState } from 'react';
import { useApp } from '../state';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Connexion, création de compte et état de la synchronisation. */
function AccountSection() {
  const { account } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!account.configured) return null;

  const submit = async (action: 'in' | 'up') => {
    if (!email || !password) { setMessage('Renseigne email et mot de passe.'); return; }
    setBusy(true);
    setMessage(null);
    const err = action === 'in' ? await account.signIn(email, password) : await account.signUp(email, password);
    setBusy(false);
    setMessage(err);
    if (!err) { setEmail(''); setPassword(''); }
  };

  if (account.email) {
    return (
      <div className="sheet-row">
        <div>
          <div className="lab">Compte</div>
          <div className="sub">
            Connecté : {account.email}
            {account.syncing
              ? ' · synchronisation en cours'
              : account.lastSync
                ? ` · synchronisé à ${new Date(account.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
          </div>
          {account.syncError && <div className="filefeedback err">{account.syncError}</div>}
        </div>
        <button className="btn ghost" style={{ minHeight: 40, padding: '6px 16px' }} onClick={() => account.signOut()}>
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div className="sheet-row">
      <div style={{ flex: '1 1 100%' }}>
        <div className="lab">Compte</div>
        <div className="sub">
          Sans compte (invité), la progression reste uniquement sur cet appareil.
          Avec un compte, elle est sauvegardée en base et te suit partout.
        </div>
        <div className="account-form">
          <input
            className="textfield"
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
          <input
            className="textfield"
            type="password"
            autoComplete="current-password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Mot de passe"
          />
          <div className="account-actions">
            <button className="btn" style={{ minHeight: 42 }} disabled={busy} onClick={() => submit('in')}>
              Se connecter
            </button>
            <button className="btn ghost" style={{ minHeight: 42 }} disabled={busy} onClick={() => submit('up')}>
              Créer un compte
            </button>
          </div>
          {message && <div className="filefeedback err">{message}</div>}
        </div>
      </div>
    </div>
  );
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

        <AccountSection />

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
