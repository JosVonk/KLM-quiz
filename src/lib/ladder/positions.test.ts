import { describe, it, expect } from 'vitest'
import { canChallenge, swapPositions, challengerLoses } from './positions'

describe('canChallenge', () => {
  it('allows challenge up to 3 positions higher', () => {
    expect(canChallenge(10, 7)).toBe(true)
    expect(canChallenge(10, 8)).toBe(true)
  })
  it('blocks challenge more than 3 positions higher', () => {
    expect(canChallenge(10, 6)).toBe(false)
  })
  it('blocks challenging same position or lower', () => {
    expect(canChallenge(5, 5)).toBe(false)
    expect(canChallenge(5, 6)).toBe(false)
  })
})

describe('swapPositions', () => {
  it('returns swapped positions', () => {
    expect(swapPositions(10, 7)).toEqual({ challengerPos: 7, challengedPos: 10 })
  })
})

describe('challengerLoses', () => {
  it('drops challenger by 1, keeps challenged', () => {
    expect(challengerLoses(10, 7)).toEqual({ challengerPos: 11, challengedPos: 7 })
  })
})
