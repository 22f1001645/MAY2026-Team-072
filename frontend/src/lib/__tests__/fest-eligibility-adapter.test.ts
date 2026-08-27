/**
 * 07-03: the progression adapter is the only place a snake_case progression key
 * exists, so its two defaulting rules are asserted here rather than at a call
 * site.
 *
 * `unlocks` must arrive as `[]` and never `undefined`, because the sponsorship
 * banner decides its own visibility with a length check — an absent key would
 * throw instead of hiding the banner.
 *
 * The two `*MeetupsCompleted` counts must stay `null` on the no-city call. They
 * are the indeterminate state the fest card renders as "Pick a city to check
 * eligibility", and coercing them to `0` would make the caption read
 * "0 of 2 completed" before the user has named a city.
 */
import { describe, expect, it } from 'vitest'
import { adaptFestEligibility } from '../api'

describe('adaptFestEligibility', () => {
  it('maps every key and defaults an absent unlocks array to []', () => {
    const adapted = adaptFestEligibility({
      org_id: 'org-1',
      city: 'Hyderabad',
      local_meetups_completed: 1,
      regional_meetups_completed: 1,
      requirements_met: 2,
      requirements_total: 2,
      fest_eligible: true,
      collaborator_threshold: 6,
    })

    expect(adapted).toEqual({
      orgId: 'org-1',
      city: 'Hyderabad',
      localMeetupsCompleted: 1,
      regionalMeetupsCompleted: 1,
      requirementsMet: 2,
      requirementsTotal: 2,
      festEligible: true,
      collaboratorThreshold: 6,
      unlocks: [],
    })
  })

  it('keeps the no-city counts null and camelises each unlock row', () => {
    const adapted = adaptFestEligibility({
      org_id: 'org-1',
      city: null,
      local_meetups_completed: null,
      regional_meetups_completed: null,
      requirements_met: 0,
      requirements_total: 2,
      fest_eligible: false,
      collaborator_threshold: 6,
      unlocks: [
        { id: 'u-1', org_id: 'org-1', city: 'Hyderabad', unlocked_at: '2026-08-23T11:04:07' },
      ],
    })

    expect(adapted.city).toBeNull()
    expect(adapted.localMeetupsCompleted).toBeNull()
    expect(adapted.regionalMeetupsCompleted).toBeNull()
    expect(adapted.unlocks).toEqual([
      { id: 'u-1', orgId: 'org-1', city: 'Hyderabad', unlockedAt: '2026-08-23T11:04:07' },
    ])
  })
})
