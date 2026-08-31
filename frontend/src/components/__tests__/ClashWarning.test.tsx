import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClashWarning from '../ClashWarning'

/* The hook is the seam: the component's whole job is deciding what to render for
 * a given clash list, so the query itself is stubbed rather than exercised. */
const useClashes = vi.fn()
vi.mock('../../lib/queries', () => ({
  useClashes: (...args: unknown[]) => useClashes(...args),
}))

const fest = {
  id: 'a1',
  title: 'Ekatva Hyderabad — Regional Fest',
  city: 'Hyderabad',
  scale: 'regional_fest',
  venue: 'T-Hub',
  starts_at: '2026-09-16T14:54:09.553562Z',
  organiser: 'Sai Teja',
}

describe('ClashWarning', () => {
  beforeEach(() => useClashes.mockReset())

  it('says nothing when the date is clear', () => {
    useClashes.mockReturnValue({ data: [], isLoading: false })
    const { container } = render(<ClashWarning city="Hyderabad" startsAt="2027-01-01T10:00" />)
    // Silence is the correct output: an all-clear banner on every proposal
    // would train organisers to scroll past this region entirely.
    expect(container).toBeEmptyDOMElement()
  })

  it('says nothing while the answer is still loading', () => {
    useClashes.mockReturnValue({ data: undefined, isLoading: true })
    const { container } = render(<ClashWarning city="Hyderabad" startsAt="2026-09-16T10:00" />)
    // A warning that flickers in after the fact is worse than one that waits.
    expect(container).toBeEmptyDOMElement()
  })

  it('names the clashing event so the organiser can judge it', () => {
    useClashes.mockReturnValue({ data: [fest], isLoading: false })
    render(<ClashWarning city="Hyderabad" startsAt="2026-09-16T10:00" />)

    expect(screen.getByText('Hyderabad already has an event around this date')).toBeInTheDocument()
    expect(screen.getByText('Ekatva Hyderabad — Regional Fest')).toBeInTheDocument()
    expect(screen.getByText(/by Sai Teja/)).toBeInTheDocument()
  })

  it('counts them when there is more than one', () => {
    useClashes.mockReturnValue({ data: [fest, { ...fest, id: 'a2', title: 'Board-Game Night' }], isLoading: false })
    render(<ClashWarning city="Hyderabad" startsAt="2026-09-16T10:00" />)
    expect(screen.getByText('Hyderabad already has 2 events around this date')).toBeInTheDocument()
  })

  it('passes excludeId through so an event never clashes with itself', () => {
    useClashes.mockReturnValue({ data: [], isLoading: false })
    render(<ClashWarning city="Hyderabad" startsAt="2026-09-16T10:00" excludeId="a1" />)
    expect(useClashes).toHaveBeenCalledWith('Hyderabad', '2026-09-16T10:00', 'a1')
  })

  it('never renders a blocking control — the decision stays with the humans', () => {
    useClashes.mockReturnValue({ data: [fest], isLoading: false })
    const { container } = render(<ClashWarning city="Hyderabad" startsAt="2026-09-16T10:00" />)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })
})
