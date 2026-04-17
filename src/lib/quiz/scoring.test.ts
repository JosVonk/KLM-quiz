import { describe, it, expect } from 'vitest'
import { calculatePoints } from './scoring'

describe('calculatePoints', () => {
  it('returns 0 for incorrect answer', () => {
    expect(calculatePoints(false, 5000, 20000)).toBe(0)
  })
  it('returns max points for instant correct answer', () => {
    expect(calculatePoints(true, 0, 20000)).toBe(1000)
  })
  it('returns min points for correct answer at time limit', () => {
    expect(calculatePoints(true, 20000, 20000)).toBe(500)
  })
  it('returns proportional points for mid-time answer', () => {
    expect(calculatePoints(true, 10000, 20000)).toBe(750)
  })
})
