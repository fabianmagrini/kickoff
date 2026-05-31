import { describe, it, expect } from 'vitest';
import { calculatePoints } from './scoring';

describe('calculatePoints', () => {
  it('awards 3 points for an exact score prediction', () => {
    expect(calculatePoints(2, 1, 2, 1)).toBe(3);
  });

  it('awards 3 points for an exact 0-0 draw prediction', () => {
    expect(calculatePoints(0, 0, 0, 0)).toBe(3);
  });

  it('awards 1 point for correct home win, wrong score', () => {
    expect(calculatePoints(2, 0, 3, 1)).toBe(1);
  });

  it('awards 1 point for correct away win, wrong score', () => {
    expect(calculatePoints(0, 2, 1, 3)).toBe(1);
  });

  it('awards 1 point for correct draw prediction, wrong score', () => {
    expect(calculatePoints(1, 1, 2, 2)).toBe(1);
  });

  it('awards 0 points for wrong outcome (predicted home win, actual away win)', () => {
    expect(calculatePoints(2, 0, 0, 1)).toBe(0);
  });

  it('awards 0 points for wrong outcome (predicted draw, actual home win)', () => {
    expect(calculatePoints(1, 1, 2, 0)).toBe(0);
  });

  it('awards 0 points for wrong outcome (predicted away win, actual draw)', () => {
    expect(calculatePoints(0, 2, 1, 1)).toBe(0);
  });

  it('awards 3 points for an exact away win prediction', () => {
    expect(calculatePoints(0, 2, 0, 2)).toBe(3);
  });

  it('awards 1 point (not 3) when only the home score matches but outcomes agree', () => {
    expect(calculatePoints(2, 0, 2, 1)).toBe(1);
  });
});
