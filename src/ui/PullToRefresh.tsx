import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as RMouseEvent, PointerEvent as RPointerEvent, ReactNode } from 'react';
import { useApp } from '../state';
import { ENGAGE_PX, REST_PX, arrowAngle, dampenPull, isPullStart, shouldRefresh } from './pull-refresh';
import { IconArrowDown, IconSpinnerArc } from './icons';

/** Durée (ms) minimale d'affichage du spinner : une synchro éclair se voit quand même. */
const SPIN_MIN_MS = 600;

/**
 * Tirer l'écran vers le bas depuis le haut de page déclenche une synchronisation
 * manuelle. Un disque de verre descend sous le doigt, la flèche se retourne au
 * seuil, relâcher lance la synchro (spinner) puis le disque se retire.
 * Geste actif seulement une fois connecté (sinon il n'y a rien à rafraîchir).
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const { account } = useApp();
  const enabled = account.email !== null;

  const [y, setY] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'pull' | 'busy'>('idle');

  const zone = useRef<HTMLDivElement>(null);
  const ptr = useRef<{ id: number; x: number; y: number } | null>(null);
  const engaged = useRef(false);
  const dead = useRef(false); // scroll ou swipe détecté : geste abandonné
  const busy = useRef(false);
  const suppressClick = useRef(false);

  // Le navigateur ne doit ni transformer la traction en scroll ni la tuer d'un
  // pointercancel : on neutralise le touchmove dès qu'un tirage est plausible.
  // (Listener natif : React ne permet pas de poser un touchmove non passif.)
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      const p = ptr.current;
      const t = e.touches[0];
      if (!p || dead.current || !t) return;
      const dx = t.clientX - p.x;
      const dy = t.clientY - p.y;
      if (engaged.current || (window.scrollY <= 0 && dy > 0 && dy >= Math.abs(dx))) e.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  const resetGesture = () => {
    ptr.current = null;
    engaged.current = false;
    dead.current = false;
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!enabled || busy.current) return;
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    ptr.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    engaged.current = false;
    dead.current = false;
    suppressClick.current = false;
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = ptr.current;
    if (!p || e.pointerId !== p.id || dead.current) return;
    // Souris/stylet sans bouton appuyé : le relâcher nous a échappé — on libère.
    if (e.pointerType !== 'touch' && e.buttons === 0) {
      resetGesture();
      setPhase('idle');
      setY(0);
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    if (!engaged.current) {
      if (window.scrollY <= 0 && isPullStart(dx, dy)) {
        engaged.current = true;
        try { e.currentTarget.setPointerCapture(p.id); } catch { /* pointeur déjà relâché */ }
        setPhase('pull');
      } else if (Math.abs(dx) >= ENGAGE_PX || dy <= -16 || (dy >= 16 && window.scrollY > 0)) {
        dead.current = true; // swipe latéral ou vrai scroll : on ne s'engagera plus
      }
      return;
    }

    setY(dampenPull(dy));
  };

  const onPointerEnd = (e: RPointerEvent<HTMLDivElement>) => {
    const p = ptr.current;
    if (!p || e.pointerId !== p.id) return;
    if (engaged.current) {
      suppressClick.current = true;
      const pulled = dampenPull(e.clientY - p.y);
      if (e.type === 'pointerup' && shouldRefresh(pulled)) {
        busy.current = true;
        setPhase('busy');
        setY(REST_PX);
        const started = performance.now();
        account.syncNow().finally(() => {
          const wait = Math.max(0, SPIN_MIN_MS - (performance.now() - started));
          setTimeout(() => {
            busy.current = false;
            setPhase('idle');
            setY(0);
          }, wait);
        });
      } else {
        setPhase('idle');
        setY(0);
      }
    }
    resetGesture();
  };

  // Après une traction, le relâcher ne doit pas cliquer ce qui est sous le doigt.
  const onClickCapture = (e: RMouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const armed = phase === 'pull' && shouldRefresh(y);

  return (
    <div
      ref={zone}
      className={`ptr ${phase === 'pull' ? 'drag' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
    >
      <div
        className={`ptr-disc ${phase} ${armed ? 'armed' : ''}`}
        style={{ '--pull-frac': y / REST_PX, opacity: Math.min(1, y / 24) } as CSSProperties}
        aria-hidden
      >
        {phase === 'busy'
          ? <span className="ptr-icon spin"><IconSpinnerArc size={20} /></span>
          : <span className="ptr-icon" style={{ transform: `rotate(${arrowAngle(y)}deg)` }}><IconArrowDown size={20} /></span>}
      </div>
      {children}
    </div>
  );
}
