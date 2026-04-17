export function canChallenge(challengerPos: number, challengedPos: number): boolean {
  const diff = challengerPos - challengedPos
  return diff >= 1 && diff <= 3
}

export function swapPositions(challengerPos: number, challengedPos: number) {
  return { challengerPos: challengedPos, challengedPos: challengerPos }
}

export function challengerLoses(challengerPos: number, challengedPos: number) {
  return { challengerPos: challengerPos + 1, challengedPos }
}
