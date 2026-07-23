import { describe, expect, it } from 'vitest';
import { ARM_PX, MAX_PX, dampen, isHorizontal, shouldTrigger, velocityAtRelease } from './swipe-gesture';

describe('dampen', () => {
  it('suit le doigt à l’identique avant le seuil', () => {
    expect(dampen(0)).toBe(0);
    expect(dampen(40)).toBe(40);
    expect(dampen(-40)).toBe(-40);
    expect(dampen(ARM_PX)).toBe(ARM_PX);
  });

  it('amortit la course au-delà du seuil', () => {
    const past = dampen(ARM_PX + 100);
    expect(past).toBeGreaterThan(ARM_PX);
    expect(past).toBeLessThan(ARM_PX + 100);
  });

  it('plafonne la course visuelle', () => {
    expect(dampen(10_000)).toBe(MAX_PX);
    expect(dampen(-10_000)).toBe(-MAX_PX);
  });

  it('reste impair (symétrique gauche/droite)', () => {
    for (const dx of [10, 80, 200]) expect(dampen(-dx)).toBe(-dampen(dx));
  });
});

describe('isHorizontal', () => {
  it('engage un geste franchement horizontal', () => {
    expect(isHorizontal(20, 3)).toBe(true);
    expect(isHorizontal(-20, 3)).toBe(true);
  });

  it('n’engage pas un début de scroll vertical ou un geste ambigu', () => {
    expect(isHorizontal(3, 20)).toBe(false);
    expect(isHorizontal(15, 14)).toBe(false);
  });

  it('n’engage pas avant la distance minimale', () => {
    expect(isHorizontal(8, 0)).toBe(false);
  });
});

describe('shouldTrigger', () => {
  it('déclenche quand la course visible atteint le seuil', () => {
    expect(shouldTrigger(ARM_PX, ARM_PX, 0)).toBe(true);
    expect(shouldTrigger(-ARM_PX, -ARM_PX, 0)).toBe(true);
  });

  it('ne déclenche pas une course courte et lente', () => {
    expect(shouldTrigger(30, 30, 0.1)).toBe(false);
    expect(shouldTrigger(-30, -30, -0.1)).toBe(false);
  });

  it('déclenche une pichenette rapide même courte', () => {
    expect(shouldTrigger(45, 45, 1.2)).toBe(true);
    expect(shouldTrigger(-45, -45, -1.2)).toBe(true);
  });

  it('ignore une vitesse opposée au déplacement (retour du doigt)', () => {
    expect(shouldTrigger(45, 45, -1.2)).toBe(false);
  });

  it('ignore une pichenette trop courte pour être intentionnelle', () => {
    expect(shouldTrigger(10, 10, 2)).toBe(false);
  });
});

describe('velocityAtRelease', () => {
  it('garde la vitesse si le relâcher suit de près le dernier mouvement', () => {
    expect(velocityAtRelease(1.2, 16)).toBe(1.2);
    expect(velocityAtRelease(-0.8, 80)).toBe(-0.8);
  });

  it('périme la vitesse après une pause immobile (jab puis arrêt)', () => {
    expect(velocityAtRelease(1.2, 150)).toBe(0);
    expect(velocityAtRelease(-2, 1500)).toBe(0);
  });
});
