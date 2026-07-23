/**
 * Maths pures du tirer-pour-rafraîchir (synchronisation manuelle).
 * La partie React (pointeurs, rendu) vit dans PullToRefresh.tsx.
 */

/** Course visible (px) au-delà de laquelle relâcher déclenche la synchro. */
export const ARM_PX = 70;
/** Course visible maximale : au-delà, le disque ne descend plus. */
export const MAX_PX = 112;
/** Course visible (px) où le disque se pose pendant la synchro. */
export const REST_PX = 62;
/** Distance (px) avant de considérer le geste comme engagé. */
export const ENGAGE_PX = 14;
/** Le doigt tire à travers un élastique : seule la moitié de la course se voit. */
const DRAG = 0.5;
/** Résistance accrue après l'armement. */
const RESIST = 0.3;

/** Déplacement du doigt → course visible : élastique, plus dur après le seuil, plafonné. */
export function dampenPull(dy: number): number {
  if (dy <= 0) return 0;
  const eased = dy * DRAG;
  const past = eased <= ARM_PX ? eased : ARM_PX + (eased - ARM_PX) * RESIST;
  return Math.min(past, MAX_PX);
}

/** Premier mouvement franchement vertical vers le bas ? (sinon on laisse scroll et swipes) */
export const isPullStart = (dx: number, dy: number): boolean =>
  dy >= ENGAGE_PX && dy > Math.abs(dx) * 1.2;

/** Au relâcher : la synchro part si la course visible a atteint le seuil. */
export const shouldRefresh = (y: number): boolean => y >= ARM_PX;

/** Rotation (deg) de la flèche pendant la traction : demi-tour complet à l'armement. */
export const arrowAngle = (y: number): number => Math.min(1, y / ARM_PX) * 180;
