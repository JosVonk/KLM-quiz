export function updatePScore(currentP: number, timesAsked: number, isCorrect: boolean): number {
  const newP = (currentP * timesAsked + (isCorrect ? 1 : 0)) / (timesAsked + 1)
  return Math.max(0, Math.min(1, newP))
}

export function updateRit(
  currentRit: number | null,
  timesAsked: number,
  isCorrect: boolean,
  playerPoints: number,
  avgPoints: number
): number | null {
  if (timesAsked < 5) return null
  const signal = ((isCorrect ? 1 : 0) - 0.5) * Math.sign(playerPoints - avgPoints)
  if (currentRit === null) return signal
  const alpha = 0.1
  return currentRit + alpha * (signal - currentRit)
}

export function shouldFlag(ritValue: number | null, timesAsked: number): boolean {
  return ritValue !== null && ritValue < 0 && timesAsked >= 5
}
