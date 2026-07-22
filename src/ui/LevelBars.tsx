import type { Level } from '../core/types';
import type { Counts } from '../core/stats';
import { fmtInt } from '../state';

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

export function LevelBars({ counts }: { counts: Counts }) {
  return (
    <div className="panel levels">
      {LEVELS.map((lvl) => {
        const { known, total } = counts.byLevel[lvl];
        const pct = total > 0 ? (known / total) * 100 : 0;
        return (
          <div className="level-row" key={lvl}>
            <span className={`level-chip ${lvl.toLowerCase()}`}>{lvl}</span>
            <div
              className="level-track"
              role="img"
              aria-label={`${lvl} : ${known} connus sur ${total}`}
            >
              <div className="level-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="level-nums" aria-hidden>
              {fmtInt(known)} / {fmtInt(total)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
