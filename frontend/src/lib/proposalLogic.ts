import type { ActivityScale } from './types'

/**
 * BUDGET-01: client mirror of backend/app/services/proposal_service.py's cap
 * formula — min(capacity * BUDGET_CAPACITY_RATE, BUDGET_ABSOLUTE_CEILING).
 * `regional_fest` is sponsor-funded and exempt (returns null).
 */
export function computeBudgetCap(scale: ActivityScale | string, capacity: number): number | null {
  if (scale === 'local_meetup' || scale === 'regional_meetup') {
    return Math.min(capacity * 200, 20_000)
  }
  return null
}

/**
 * PROPOSAL-03: mirrors Activity.is_mega_meetup (backend/app/models/__init__.py) —
 * true once 3+ collaborating orgs (including primary) have accepted.
 */
export function isMegaMeetup(collaborators: Array<{ status: string }>): boolean {
  return collaborators.filter((c) => c.status === 'accepted').length >= 3
}
