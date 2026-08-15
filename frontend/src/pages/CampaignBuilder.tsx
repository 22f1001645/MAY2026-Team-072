/**
 * CampaignBuilder — /events/:id/campaign
 *
 * Phase 5, Plan 05-01 (DESIGN-01 thin slice). This page is deliberately thin:
 * - Reads schedule items from the server via useScheduleItems (not local state).
 * - Renders the items as a plain list (time block + title).
 * - Provides a "+ Add item" ghost button that calls useCreateScheduleItem.
 * - ScheduleRow (blur-save), PresetAccordion, and PipelineStepper arrive in later plans.
 *
 * Authorization gate: `capabilities?.manageableActivityIds?.includes(id!)`
 * — exactly as EventDetail.tsx:30 does. Never a quoted POR string, which
 * no-por-literals.test.ts fails the build on.
 *
 * Route: /events/:id/campaign (OD-4: matches the organiser route block
 * pattern /events/:id/manage, /events/:id/expenses, /events/:id/checkin).
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Loading, ErrorState } from '../components/states'
import { SectionTitle, Button, Card } from '../components/ui'
import { useCapabilities, useEvent } from '../lib/queries'
import { useScheduleItems, useCreateScheduleItem } from '../lib/queries'
import type { ApiScheduleItem } from '../lib/types'

export default function CampaignBuilder() {
  const { id } = useParams<{ id: string }>()
  const { data: capabilities } = useCapabilities()
  const { data: e, isLoading: eventLoading, isError: eventError, error: eventErr } = useEvent(id)
  const { data: scheduleItems = [], isLoading: scheduleLoading } = useScheduleItems(id)
  const createMut = useCreateScheduleItem(id)

  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const canManage = capabilities?.manageableActivityIds?.includes(id!)

  if (eventLoading || scheduleLoading) return <Loading label="Loading campaign builder…" />
  if (eventError) return <ErrorState error={eventErr} />
  if (!e) return <div className="p-8 text-center text-graytext-light">Event not found</div>

  const handleAddItem = () => {
    const title = newTitle.trim()
    if (!title) return
    createMut.mutate({ title }, {
      onSuccess: () => {
        setNewTitle('')
        setAdding(false)
      },
    })
  }

  return (
    <div className="space-y-6">
      <Link
        to="/organiser"
        className="mb-4 inline-block text-[13px] text-graytext-light hover:text-teal"
      >
        ← Dashboard
      </Link>

      <SectionTitle
        eyebrow="Campaign"
        title="Campaign Builder"
        sub={`Design the agenda and campaign details for "${e.title}".`}
      />

      {/* Schedule list */}
      <Card className="p-6 space-y-3">
        <h2 className="text-[15px] font-semibold text-offwhite">Event Schedule</h2>

        {scheduleItems.length === 0 && !adding && (
          <p className="text-[13px] text-graytext-light">
            No schedule items yet. Add the first one below.
          </p>
        )}

        <ul className="space-y-2">
          {(scheduleItems as ApiScheduleItem[]).map(item => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/4 px-4 py-3"
            >
              {item.timeBlock && (
                <span className="shrink-0 text-[12px] font-medium text-teal mt-0.5 w-28">
                  {item.timeBlock}
                </span>
              )}
              <span className="text-[14px] text-offwhite">{item.title}</span>
            </li>
          ))}
        </ul>

        {/* Add item — ghost button or inline form */}
        {canManage && !adding && (
          <button
            id="campaign-add-schedule-item"
            onClick={() => setAdding(true)}
            className="mt-2 w-full rounded-lg border border-dashed border-white/20 py-2 text-[13px] text-graytext-mid hover:border-teal/50 hover:text-teal transition-colors"
          >
            + Add item
          </button>
        )}

        {canManage && adding && (
          <div className="mt-2 flex gap-2">
            <input
              id="campaign-new-item-title"
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              placeholder="Item title…"
              className="flex-1 rounded-lg border border-white/15 bg-white/6 px-3 py-2 text-[13px] text-offwhite placeholder:text-graytext-mid outline-none focus:border-teal/50"
            />
            <Button
              id="campaign-add-item-submit"
              onClick={handleAddItem}
              disabled={createMut.isPending}
            >
              Add
            </Button>
            <Button
              variant="secondary"
              id="campaign-add-item-cancel"
              onClick={() => { setAdding(false); setNewTitle('') }}
            >
              Cancel
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
