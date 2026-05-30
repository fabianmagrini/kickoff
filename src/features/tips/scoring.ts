/**
 * Calculate points earned for a tip given the actual match result.
 * - 3 pts: exact score prediction
 * - 1 pt:  correct winner/draw, wrong score
 * - 0 pts: incorrect outcome
 */
export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
): number {
  if (predictedHome === actualHome && predictedAway === actualAway) return 3;
  const predictedOutcome = Math.sign(predictedHome - predictedAway);
  const actualOutcome = Math.sign(actualHome - actualAway);
  return predictedOutcome === actualOutcome ? 1 : 0;
}
