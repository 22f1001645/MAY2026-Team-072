import { describe, expect, it } from 'vitest'
import { isPublicEventPath } from '../App'

/* The anonymous client surface, pinned (OD-3 / T-05-34).
 *
 * This predicate is the whole of what a visitor with no session may render. It
 * would take one character — a prefix test instead of an anchored one — to hand
 * every organiser sub-page of an event to anonymous visitors, and nothing on
 * screen would look different until someone opened /events/<id>/expenses in a
 * private window. So the boundary is asserted from both sides.
 */
describe('isPublicEventPath', () => {
  it('accepts a single segment after /events/', () => {
    expect(isPublicEventPath('/events/ml-meetup-hyd-a3f9b2')).toBe(true)
    expect(isPublicEventPath('/events/act_01H9')).toBe(true)
  })

  it('rejects every organiser sub-path', () => {
    for (const sub of ['manage', 'campaign', 'workspace', 'checkin', 'expenses']) {
      expect(isPublicEventPath(`/events/act_01H9/${sub}`)).toBe(false)
    }
  })

  it('rejects the feed, other routes, and a trailing slash', () => {
    expect(isPublicEventPath('/events')).toBe(false)
    expect(isPublicEventPath('/events/')).toBe(false)
    expect(isPublicEventPath('/events/act_01H9/')).toBe(false)
    expect(isPublicEventPath('/admin/approvals')).toBe(false)
    expect(isPublicEventPath('/orgs/org_1')).toBe(false)
    expect(isPublicEventPath('/discover')).toBe(false)
  })

  it('is anchored at the start, so no prefix can smuggle a path in', () => {
    expect(isPublicEventPath('/admin/events/act_01H9')).toBe(false)
    expect(isPublicEventPath('x/events/act_01H9')).toBe(false)
  })
})
