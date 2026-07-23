import type { Eta, LevelEta } from '../core/stats';
import { fmtDateShort, fmtInt, fmtRate } from '../state';

export function LevelBars({ etas, eta }: { etas: LevelEta[]; eta: Eta }) {
  const showCap = etas.some((l) => l.date != null);
  return (
    <div className="panel levels">
      {etas.map(({ level, known, total, remaining, date }) => {
        const pct = total > 0 ? (known / total) * 100 : 0;
        const done = remaining === 0 && total > 0;
        return (
          <div className="level-row" key={level}>
            <span className={`level-chip ${level.toLowerCase()}`}>{level}</span>
            <div
              className="level-track"
              role="img"
              aria-label={`${level} : ${known} connus sur ${total}`}
            >
              <div className="level-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="level-nums" aria-hidden>
              {fmtInt(known)} / {fmtInt(total)}
            </span>
            {done ? (
              <div className="level-meta">
                <span className="level-done">Niveau acquis ✓</span>
              </div>
            ) : date != null ? (
              <div className="level-meta">
                <span>{fmtInt(remaining)} restants</span>
                <span className="level-eta">≈ {fmtDateShort(date)}</span>
              </div>
            ) : null}
          </div>
        );
      })}
      {showCap && (
        <p className="levels-cap">
          Projection niveau après niveau, {eta.basis === 'history' ? 'à ton rythme réel' : 'à ton objectif'} de{' '}
          {fmtRate(eta.perDay)} mots par jour.
        </p>
      )}
    </div>
  );
}
