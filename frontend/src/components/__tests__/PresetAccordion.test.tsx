import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PresetAccordion } from '../PresetAccordion'
import type { ApiSchedulePreset } from '../../lib/types'

/* PresetAccordion — DESIGN-01 / UI-SPEC §2.3 (E3).
 *
 * Three of these claims are structural rather than cosmetic:
 *
 *  1. Zero presets renders nothing AT ALL, so no caller can leak an empty
 *     "Quick-start presets" card onto a scale that has none.
 *  2. At most one section is open. The single open-name state is what makes
 *     that true by construction; an effect-based version would drift.
 *  3. Apply hands over the preset's items in their original order — the order
 *     is what the server turns into positions.
 */

const presets: ApiSchedulePreset[] = [
  {
    name: 'Standard 2h City Meetup',
    items: [
      { timeBlock: '10:00 - 10:15', title: 'Arrival & icebreaker' },
      { timeBlock: '10:15 - 10:30', title: 'Introduction round' },
    ],
  },
  {
    name: 'Lightning Talks Evening',
    items: [{ timeBlock: '18:00 - 18:30', title: 'Doors open' }],
  },
]

const row = (name: string) => screen.getByRole('button', { name: new RegExp(name) })

describe('PresetAccordion', () => {
  it('renders every preset collapsed, with no sample item in the document', () => {
    render(<PresetAccordion presets={presets} onApply={vi.fn()} />)

    expect(row('Standard 2h City Meetup')).toBeInTheDocument()
    expect(row('Lightning Talks Evening')).toBeInTheDocument()
    expect(screen.queryByText(/Arrival & icebreaker/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Doors open/)).not.toBeInTheDocument()
  })

  it('expands the clicked preset and lists its sample items with a CTA', async () => {
    const user = userEvent.setup()
    render(<PresetAccordion presets={presets} onApply={vi.fn()} />)

    await user.click(row('Standard 2h City Meetup'))

    expect(screen.getByText(/Arrival & icebreaker/)).toBeInTheDocument()
    expect(screen.getByText(/Introduction round/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use this preset' })).toBeInTheDocument()
  })

  it('keeps at most one preset expanded', async () => {
    const user = userEvent.setup()
    render(<PresetAccordion presets={presets} onApply={vi.fn()} />)

    await user.click(row('Standard 2h City Meetup'))
    await user.click(row('Lightning Talks Evening'))

    expect(screen.queryByText(/Arrival & icebreaker/)).not.toBeInTheDocument()
    expect(screen.getByText(/Doors open/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Use this preset' })).toHaveLength(1)
  })

  it('applies the preset items once, in their original order', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<PresetAccordion presets={presets} onApply={onApply} />)

    await user.click(row('Standard 2h City Meetup'))
    await user.click(screen.getByRole('button', { name: 'Use this preset' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith(presets[0].items)
    expect(onApply.mock.calls[0][0].map((i: { title: string }) => i.title)).toEqual([
      'Arrival & icebreaker',
      'Introduction round',
    ])
  })

  it('renders nothing at all when the scale has no presets', () => {
    const { container } = render(<PresetAccordion presets={[]} onApply={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes a truncated preset name in full through a title tooltip', () => {
    const longName = 'A preset name far longer than the row it has to fit inside of'
    render(
      <PresetAccordion
        presets={[{ name: longName, items: [{ timeBlock: '09:00', title: 'Start' }] }]}
        onApply={vi.fn()}
      />,
    )
    expect(row('A preset name far longer')).toHaveAttribute('title', longName)
  })
})
