import { fmtDate, fmtInt, fmtRate, useApp } from '../state';
import { Ring } from './Ring';
import { LevelBars } from './LevelBars';

interface Props {
  onStart: () => void;
  onConfigure: () => void;
  onGoDifficult: () => void;
  onGoTriage: () => void;
}

export function Dashboard({ onStart, onConfigure, onGoDifficult, onGoTriage }: Props) {
  const { counts, eta, streak, st } = useApp();
  const done = counts.known === counts.total && counts.total > 0;
  const hasHistory = st.events.some((e) => e[3] === 'r');

  let exLine: string;
  if (done) {
    exLine = 'Les 3 000 mots sont connus. Chapeau bas.';
  } else if (eta.basis === 'history' && eta.date) {
    exLine = `À ce rythme (${fmtRate(eta.perDay)} mots par jour), tu termineras vers le ${fmtDate(eta.date)}.`;
  } else if (!hasHistory && counts.known === 0) {
    exLine = 'Commence par trier les mots que tu connais déjà, puis lance une session pour établir ton rythme.';
  } else if (eta.date) {
    exLine = `Avec un objectif de ${fmtInt(st.settings.dailyGoal)} mots par jour, tu terminerais vers le ${fmtDate(eta.date)}. L’estimation s’affinera avec tes révisions.`;
  } else {
    exLine = 'Fixe un objectif quotidien dans les réglages pour estimer ta date de fin.';
  }

  return (
    <>
      <section className="panel hero" aria-label="Progression">
        <div className="hero-grid">
          <Ring known={counts.known} total={counts.total} />
          <div>
            <div className="eyebrow">The Oxford 3000™ · anglais américain</div>
            <div className="entry-word">
              progrès <span className="entry-meta"><span aria-hidden>/pʁɔ.ɡʁɛ/ </span><span className="pos">n.m.</span></span>
            </div>
            <div className="entry-def">
              fait d’avancer : <b>{fmtInt(counts.known)}</b> {counts.known > 1 ? 'mots connus' : 'mot connu'},{' '}
              <b>{fmtInt(eta.remaining)}</b> restants.
            </div>
            <p className="entry-ex">{exLine}</p>
          </div>
        </div>

        <div className="tiles">
          <div className="tile panel">
            <div className="v">{fmtInt(eta.remaining)}</div>
            <div className="l">restants</div>
          </div>
          <button className="tile panel tappable" onClick={onGoDifficult}>
            <div className="v"><span className={counts.flagged > 0 ? 'swipe swipe-mini' : ''}>{fmtInt(counts.flagged)}</span></div>
            <div className="l">difficiles</div>
          </button>
          <div className="tile panel">
            <div className="v">{fmtInt(streak)}<span className="u">j</span></div>
            <div className="l">d’affilée</div>
          </div>
          <div className="tile panel">
            <div className="v">{fmtRate(eta.perDay)}<span className="u">/j</span></div>
            <div className="l">{eta.basis === 'history' ? 'rythme réel' : 'objectif'}</div>
          </div>
        </div>

        <div className="cta-row">
          <button className="btn big" onClick={onStart}>
            Réviser {st.settings.sessionSize} mots
          </button>
          {counts.fresh === counts.total && counts.total > 0 ? (
            <button className="btn ghost big" onClick={onGoTriage}>
              Trier les mots déjà connus
            </button>
          ) : (
            <button className="btn ghost big" onClick={onConfigure}>
              Choisir le tirage
            </button>
          )}
        </div>
      </section>

      <h2 className="section-title">Par niveau</h2>
      <LevelBars counts={counts} />
    </>
  );
}
