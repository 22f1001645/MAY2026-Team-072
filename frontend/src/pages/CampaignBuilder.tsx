/**
 * CampaignBuilder — /events/:id/campaign
 *
 * Phase 5, Plans 05-01 and 05-06 (DESIGN-01):
 * - Reads schedule items from the server via useScheduleItems (not local state).
 * - Renders each item as a ScheduleRow: blur-save, arrow reorder, delete.
 * - Provides a "+ Add item" ghost button that calls useCreateScheduleItem.
 * - PipelineStepper arrives in a later plan.
 *
 * `disabled` is sourced from the manage capability, not from the campaign's
 * live status: there is no campaign query on the client yet, and the server's
 * 409 `campaign_live` is the actual control either way (T-05-31). The row's
 * disabled affordance switches source the moment that query lands.
 *
 * Reorder sends a patch carrying `position` alone, which is the server's
 * reorder branch — a whole-row replace here would let a blur-save in flight
 * overwrite the move (T-05-30).
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

import { PresetAccordion } from '../components/PresetAccordion'
import { ScheduleRow } from '../components/ScheduleRow'
import { Loading, ErrorState } from '../components/states'
import { SectionTitle, Button, Card } from '../components/ui'
import { useCapabilities, useEvent } from '../lib/queries'
import {
  useScheduleItems,
  useSchedulePresets,
  useCreateScheduleItem,
  useUpdateScheduleItem,
  useDeleteScheduleItem,
} from '../lib/queries'
import type { ApiScheduleItem } from '../lib/types'

export default function CampaignBuilder() {
  const { id } = useParams<{ id: string }>()
  const { data: capabilities } = useCapabilities()
  const { data: e, isLoading: eventLoading, isError: eventError, error: eventErr } = useEvent(id)
  const { data: scheduleItems = [], isLoading: scheduleLoading } = useScheduleItems(id)
  const { data: presets } = useSchedulePresets(e?.scale)
  const createMut = useCreateScheduleItem(id)
  const updateMut = useUpdateScheduleItem(id)
  const deleteMut = useDeleteScheduleItem(id)

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

  /** Post each preset item in order, awaiting each one so the server assigns
   *  ascending positions. The rows are never assembled here — the list comes
   *  back from the server, so its order is the server's. */
  const handleApplyPreset = async (items: { timeBlock: string; title: string }[]) => {
    for (const preset of items) {
      await createMut.mutateAsync({ title: preset.title, timeBlock: preset.timeBlock })
    }
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

        {canManage && <PresetAccordion presets={presets ?? []} onApply={handleApplyPreset} />}

        {scheduleItems.length === 0 && !adding && (
          <p className="text-[13px] text-graytext-light">
            No schedule items yet. Use a preset to get started quickly.
          </p>
        )}

        <div>
          {(scheduleItems as ApiScheduleItem[]).map((item, i) => (
            <ScheduleRow
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === scheduleItems.length - 1}
              disabled={!canManage}
              onUpdate={(itemId, patch) => updateMut.mutateAsync({ itemId, patch })}
              onDelete={itemId => deleteMut.mutate(itemId)}
              onMoveUp={itemId => updateMut.mutate({ itemId, patch: { position: i - 1 } })}
              onMoveDown={itemId => updateMut.mutate({ itemId, patch: { position: i + 1 } })}
            />
          ))}
        </div>

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
