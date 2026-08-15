/**
 * PresetAccordion — scale-appropriate quick-start agendas (DESIGN-01 / D-02).
 *
 * Design contract: UI-SPEC §2.3 / E3.
 * - Zero presets renders nothing at all; the parent never has to know to hide it.
 * - Exactly one preset is expanded at a time, by construction: a single
 *   `useState<string | null>` holds the open name, so opening one closes the
 *   other without an effect that could drift.
 * - The expanded list is height-clamped and scrolls inside the card rather than
 *   pushing the page.
 * - Names and sample items truncate in place and carry the full text in a native
 *   `title` tooltip.
 *
 * The catalogue is static server-side reference data, so there is no loading
 * skeleton here and no refetch interval on the hook that feeds it.
 */
import { useState } from 'react'

import { Button, Card } from './ui'
import { cx } from '../lib/format'
import type { ApiSchedulePreset } from '../lib/types'

export interface PresetAccordionProps {
  presets: ApiSchedulePreset[]
  onApply: (items: ApiSchedulePreset['items']) => void
}

export function PresetAccordion({ presets, onApply }: PresetAccordionProps) {
  const [openName, setOpenName] = useState<string | null>(null)

  if (presets.length === 0) return null

  return (
    <Card className="p-4 mb-4">
      <h3 className="text-h3 font-semibold text-offwhite">Quick-start presets</h3>

      {presets.map(preset => {
        const isOpen = openName === preset.name
        return (
          <div key={preset.name}>
            <button
              type="button"
              title={preset.name}
              aria-expanded={isOpen}
              onClick={() => setOpenName(isOpen ? null : preset.name)}
              className="flex items-center justify-between w-full py-2.5 border-b border-divider/50 hover:text-teal text-body transition"
            >
              <span className="truncate text-left">{preset.name}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
                className={cx(
                  'shrink-0 transition-transform duration-200',
                  isOpen && 'rotate-180',
                )}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="max-h-[400px] transition-all duration-300 ease-material overflow-hidden">
                <ul className="max-h-[400px] overflow-y-auto py-2">
                  {preset.items.map((item, i) => (
                    <li
                      key={`${item.title}-${i}`}
                      title={`${item.timeBlock} ${item.title}`.trim()}
                      className="truncate py-1 text-caption text-graytext-light"
                    >
                      {item.timeBlock && <span className="text-teal">{item.timeBlock}</span>}{' '}
                      {item.title}
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="secondary" onClick={() => onApply(preset.items)}>
                  Use this preset
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </Card>
  )
}
