import { describe, it, expect } from 'vitest'
import { computeBudgetCap } from '../lib/proposalLogic'

describe('computeBudgetCap (BUDGET-01)', () => {
  it('local_meetup capacity=50 -> cap=10000', () => {
    expect(computeBudgetCap('local_meetup', 50)).toBe(10_000)
  })

  it('local_meetup capacity=200 -> cap=20000 (absolute ceiling)', () => {
    expect(computeBudgetCap('local_meetup', 200)).toBe(20_000)
  })

  it('regional_meetup capacity=100 -> cap=20000', () => {
    expect(computeBudgetCap('regional_meetup', 100)).toBe(20_000)
  })

  it('regional_fest is exempt -> null', () => {
    expect(computeBudgetCap('regional_fest', 500)).toBeNull()
  })

  it('budget at cap is valid', () => {
    const cap = computeBudgetCap('local_meetup', 50)!
    expect(10_000 <= cap).toBe(true)
  })

  it('budget over cap is invalid', () => {
    const cap = computeBudgetCap('local_meetup', 50)!
    expect(10_001 > cap).toBe(true)
  })
})
