const MAX_POINTS = 1000
const MIN_POINTS = 500

export function calculatePoints(isCorrect: boolean, timeMs: number, timeLimitMs: number): number {
  if (!isCorrect) return 0
  const ratio = Math.max(0, 1 - timeMs / timeLimitMs)
  return Math.round(MIN_POINTS + ratio * (MAX_POINTS - MIN_POINTS))
}
