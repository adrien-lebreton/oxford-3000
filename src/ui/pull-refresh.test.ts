import { describe, expect, it } from 'vitest';
import { ARM_PX, MAX_PX, REST_PX, arrowAngle, dampenPull, isPullStart, shouldRefresh } from './pull-refresh';

describe('dampenPull', () => {
  it('ignore les mouvements vers le haut', () => {
    expect(dampenPull(0)).toBe(0);
    expect(dampenPull(-80)).toBe(0);
  });

  it('suit le doigt avec élasticité : la course visible est réduite', () => {
    expect(dampenPull(40)).toBeGreaterThan(0);
    expect(dampenPull(40)).toBeLessThan(40);
    expect(dampenPull(80)).toBeGreaterThan(dampenPull(40));
  });

  it('amortit davantage après l’armement', () => {
    const avant = dampenPull(80) - dampenPull(60);
    const apres = dampenPull(200) - dampenPull(180);
    expect(shouldRefresh(dampenPull(180))).toBe(true); // on est bien au-delà du seuil
    expect(apres).toBeLessThan(avant);
  });

  it('plafonne la course visible', () => {
    expect(dampenPull(10_000)).toBe(MAX_PX);
  });

  it('le seuil d’armement reste atteignable malgré l’élastique', () => {
    expect(dampenPull(10_000)).toBeGreaterThanOrEqual(ARM_PX);
  });
});

describe('isPullStart', () => {
  it('engage un geste franchement vertical vers le bas', () => {
    expect(isPullStart(3, 20)).toBe(true);
    expect(isPullStart(-3, 20)).toBe(true);
  });

  it('n’engage ni un geste vers le haut ni un geste horizontal', () => {
    expect(isPullStart(3, -20)).toBe(false);
    expect(isPullStart(20, 3)).toBe(false);
  });

  it('n’engage pas un geste ambigu en diagonale', () => {
    expect(isPullStart(14, 15)).toBe(false);
  });

  it('n’engage pas avant la distance minimale', () => {
    expect(isPullStart(0, 8)).toBe(false);
  });
});

describe('shouldRefresh', () => {
  it('déclenche au seuil, pas avant', () => {
    expect(shouldRefresh(ARM_PX)).toBe(true);
    expect(shouldRefresh(ARM_PX - 1)).toBe(false);
  });
});

describe('arrowAngle', () => {
  it('la flèche fait un demi-tour exactement à l’armement', () => {
    expect(arrowAngle(0)).toBe(0);
    expect(arrowAngle(ARM_PX / 2)).toBe(90);
    expect(arrowAngle(ARM_PX)).toBe(180);
    expect(arrowAngle(MAX_PX)).toBe(180); // et n’en fait pas plus au-delà
  });
});

describe('REST_PX', () => {
  it('le repos du disque reste sous le seuil d’armement', () => {
    expect(REST_PX).toBeLessThanOrEqual(ARM_PX);
  });
});
