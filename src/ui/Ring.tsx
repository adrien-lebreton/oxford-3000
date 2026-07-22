import { fmtInt } from '../state';

export function Ring({ known, total }: { known: number; total: number }) {
  const size = 148;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? known / total : 0;

  return (
    <div className="ring" role="img" aria-label={`${known} mots connus sur ${total}`}>
      <svg width={size} height={size}>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <div className="ring-center" aria-hidden>
        <div className="ring-count">{fmtInt(known)}</div>
        <div className="ring-total">sur {fmtInt(total)}</div>
      </div>
    </div>
  );
}
