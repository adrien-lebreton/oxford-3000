import { useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent, MouseEvent as RMouseEvent, ReactNode } from 'react';
import { ARM_PX, dampen, isHorizontal, shouldTrigger, velocityAtRelease } from './swipe-gesture';

export interface SwipeAction {
  label: string;
  icon?: ReactNode;
  /** Teinte du bandeau : vert « connu » ou jaune surligneur « difficile ». */
  kind: 'good' | 'hard';
  onTrigger: () => void;
}

interface Props {
  /** Swipe vers la gauche — bandeau révélé à droite. */
  left: SwipeAction;
  /** Swipe vers la droite — bandeau révélé à gauche. */
  right: SwipeAction;
  children: ReactNode;
}

/**
 * Rangée glissante façon Tinder : l'enfant suit le doigt, un fond coloré se
 * révèle, relâcher au-delà du seuil déclenche l'action puis la rangée revient
 * en place. Un tap sans glissement reste un clic normal.
 */
export function SwipeRow({ left, right, children }: Props) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const ptr = useRef<{ id: number; x: number; y: number } | null>(null);
  const engaged = useRef(false);
  const dead = useRef(false); // scroll vertical détecté : geste abandonné
  const vel = useRef(0);
  const lastMove = useRef<{ dx: number; t: number } | null>(null);
  const suppressClick = useRef(false);

  const reset = () => {
    ptr.current = null;
    engaged.current = false;
    dead.current = false;
    vel.current = 0;
    lastMove.current = null;
    setDragging(false);
    setX(0);
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    ptr.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    engaged.current = false;
    dead.current = false;
    vel.current = 0;
    lastMove.current = null;
    suppressClick.current = false;
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = ptr.current;
    if (!p || e.pointerId !== p.id || dead.current) return;
    // Souris/stylet sans bouton appuyé : l'appui a été relâché hors de la rangée
    // (le pointerup ne nous est jamais parvenu) — on libère tout, sinon le simple
    // survol ferait glisser la rangée.
    if (e.pointerType !== 'touch' && e.buttons === 0) {
      reset();
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    if (!engaged.current) {
      if (isHorizontal(dx, dy)) {
        engaged.current = true;
        try { e.currentTarget.setPointerCapture(p.id); } catch { /* pointeur déjà relâché */ }
        setDragging(true);
        lastMove.current = { dx, t: e.timeStamp }; // amorce la mesure de vitesse
      } else if (Math.abs(dy) > 16) {
        dead.current = true; // c'est un scroll : on ne s'engagera plus
      }
      return;
    }

    const prev = lastMove.current;
    if (prev && e.timeStamp > prev.t) {
      const inst = (dx - prev.dx) / (e.timeStamp - prev.t);
      // Lissage léger : la dernière frame seule est trop bruitée (décollement du doigt)
      vel.current = 0.6 * inst + 0.4 * vel.current;
    }
    lastMove.current = { dx, t: e.timeStamp };
    setX(dampen(dx));
  };

  const onPointerEnd = (e: RPointerEvent<HTMLDivElement>) => {
    const p = ptr.current;
    if (!p || e.pointerId !== p.id) return;
    if (engaged.current) {
      suppressClick.current = true;
      const dx = e.clientX - p.x;
      const visible = dampen(dx);
      const last = lastMove.current;
      const v = last ? velocityAtRelease(vel.current, e.timeStamp - last.t) : 0;
      if (e.type === 'pointerup' && shouldTrigger(visible, dx, v)) {
        (visible > 0 ? right : left).onTrigger();
      }
    }
    reset();
  };

  // Après un glissement, le relâcher ne doit pas ouvrir la fiche.
  const onClickCapture = (e: RMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const armed = Math.abs(x) >= ARM_PX;

  return (
    <div
      className={`swiperow ${dragging ? 'drag' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
    >
      {/* bandeaux révélés dans la zone dégagée seulement (la rangée est translucide) */}
      <div
        className={`swipe-under start ${right.kind} ${x > 0 && armed ? 'armed' : ''}`}
        style={{ width: Math.max(0, x), opacity: x > 0 ? Math.min(1, x / 56) : 0 }}
        aria-hidden
      >
        <span className="lbl">{right.icon}{right.label}</span>
      </div>
      <div
        className={`swipe-under end ${left.kind} ${x < 0 && armed ? 'armed' : ''}`}
        style={{ width: Math.max(0, -x), opacity: x < 0 ? Math.min(1, -x / 56) : 0 }}
        aria-hidden
      >
        <span className="lbl">{left.icon}{left.label}</span>
      </div>
      <div className="swipe-mover" style={{ transform: `translateX(${x}px)` }}>
        {children}
      </div>
    </div>
  );
}
