/**
 * Maths pures du glissement latéral des rangées (page Mots).
 * La partie React (pointeurs, rendu) vit dans SwipeRow.tsx.
 */

/** Course visible (px) au-delà de laquelle relâcher déclenche l'action. */
export const ARM_PX = 76;
/** Course visuelle maximale : au-delà, la rangée ne suit plus. */
export const MAX_PX = 132;
/** Distance (px) avant de considérer le geste comme engagé. */
export const ENGAGE_PX = 14;
/** Vitesse (px/ms) d'une pichenette qui déclenche même sous le seuil. */
const FLING_V = 0.55;
/** Course minimale (px) pour qu'une pichenette compte. */
const FLING_PX = 36;
/** Résistance élastique après le seuil. */
const RESIST = 0.32;

/** Déplacement du doigt → course visible : linéaire, puis élastique, puis plafonnée. */
export function dampen(dx: number): number {
  const abs = Math.abs(dx);
  const eased = abs <= ARM_PX ? abs : ARM_PX + (abs - ARM_PX) * RESIST;
  return Math.sign(dx) * Math.min(eased, MAX_PX);
}

/** Premier mouvement franchement horizontal ? (sinon on laisse le scroll vertical) */
export const isHorizontal = (dx: number, dy: number): boolean =>
  Math.abs(dx) >= ENGAGE_PX && Math.abs(dx) > Math.abs(dy) * 1.2;

/**
 * Au relâcher : l'action part si la course visible a atteint le seuil,
 * ou si le doigt est parti en pichenette rapide dans le même sens.
 */
export const shouldTrigger = (x: number, dx: number, v: number): boolean =>
  Math.abs(x) >= ARM_PX
  || (Math.abs(v) >= FLING_V && Math.abs(dx) >= FLING_PX && Math.sign(v) === Math.sign(dx));

/** Âge (ms) au-delà duquel la dernière vitesse mesurée ne compte plus. */
const VEL_TTL_MS = 100;

/**
 * Un doigt immobile n'émet aucun événement : la vitesse mesurée sur le dernier
 * couple de pointermove se périme. Après une pause, la pichenette ne compte plus.
 */
export const velocityAtRelease = (v: number, msSinceLastMove: number): number =>
  msSinceLastMove <= VEL_TTL_MS ? v : 0;
