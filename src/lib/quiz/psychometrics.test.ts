import { describe, it, expect } from 'vitest'
import { updatePScore, updateRit } from './psychometrics'

describe('updatePScore', () => {
  it('increases p_score when answered correctly', () => {
    const newScore = updatePScore(0.4, 10, true)
    expect(newScore).toBeGreaterThan(0.4)
  })
  it('decreases p_score when answered incorrectly', () => {
    const newScore = updatePScore(0.6, 10, false)
    expect(newScore).toBeLessThan(0.6)
  })
  it('stays between 0 and 1', () => {
    expect(updatePScore(0.0, 100, false)).toBeGreaterThanOrEqual(0)
    expect(updatePScore(1.0, 100, true)).toBeLessThanOrEqual(1)
  })
})

describe('updateRit', () => {
  it('returns null when fewer than 5 answers', () => {
    expect(updateRit(null, 4, true, 700, 600)).toBeNull()
  })
  it('returns a number when 5 or more answers', () => {
    const result = updateRit(null, 5, true, 800, 600)
    expect(typeof result).toBe('number')
  })
  it('adjusts existing rit incrementally without resetting', () => {
    const initial = 0.3
    const updated = updateRit(initial, 10, true, 800, 500)
    expect(updated).not.toBeNull()
    expect(updated).not.toBe(initial)
  })
})
