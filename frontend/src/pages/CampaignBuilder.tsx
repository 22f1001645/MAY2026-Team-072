/**
 * CampaignBuilder — /events/:id/campaign
 *
 * Phase 5, Plans 05-01 and 05-06 (DESIGN-01):
 * - Reads schedule items from the server via useScheduleItems (not local state).
 * - Renders each item as a ScheduleRow: blur-save, arrow reorder, delete.
 * - Provides a "+ Add item" ghost button that calls useCreateScheduleItem.
 *
 * Plan 05-08 (CAMPAIGN-06) adds the PipelineStepper above the sections. Its
 * five steps read the campaign payload's server-computed `completeness`, so
 * "done" keeps one definition; a failed campaign query fails the whole page
 * rather than rendering a stepper from data that never arrived.
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

import { FormFieldRow } from '../components/FormFieldRow'
import { PipelineStepper } from '../components/PipelineStepper'
import { PosterUpload } from '../components/PosterUpload'
import { PushLiveGate } from '../components/PushLiveGate'
import { PresetAccordion } from '../components/PresetAccordion'
import { RegistrationLinkCard } from '../components/RegistrationLinkCard'
import { ScheduleRow } from '../components/ScheduleRow'
import { Loading, ErrorState } from '../components/states'
import { SectionTitle, Button, Card, useToast } from '../components/ui'
import { useCapabilities, useEvent } from '../lib/queries'
import {
  useScheduleItems,
  useSchedulePresets,
  useCreateScheduleItem,
  useUpdateScheduleItem,
  useDeleteScheduleItem,
  useCampaign,
  useFormFields,
  useCreateFormField,
  useUpdateFormField,
  useDeleteFormField,
  useGenerateSlug,
  usePushLive,
  useUploadPoster,
} from '../lib/queries'
import { CAMPAIGN_LIVE } from '../lib/types'
import type { ApiFormField, ApiScheduleItem } from '../lib/types'

export default function CampaignBuilder() {
  const { id } = useParams<{ id: string }>()
  const { data: capabilities } = useCapabilities()
  const { data: e, isLoading: eventLoading, isError: eventError, error: eventErr } = useEvent(id)
  const { data: scheduleItems = [], isLoading: scheduleLoading } = useScheduleItems(id)
  const { data: presets } = useSchedulePresets(e?.scale)
  const createMut = useCreateScheduleItem(id)
  const updateMut = useUpdateScheduleItem(id)
  const deleteMut = useDeleteScheduleItem(id)

  const {
    data: campaign,
    isLoading: campaignLoading,
    isError: campaignError,
    error: campaignErr,
  } = useCampaign(id)
  const { data: formFields = [] } = useFormFields(id)
  const createFieldMut = useCreateFormField(id)
  const updateFieldMut = useUpdateFormField(id)
  const deleteFieldMut = useDeleteFormField(id)
  const generateSlugMut = useGenerateSlug(id)
  const pushLiveMut = usePushLive(id)
  const uploadPosterMut = useUploadPoster(id)
  const { addToast } = useToast()

  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [addingField, setAddingField] = useState(false)

  const canManage = capabilities?.manageableActivityIds?.includes(id!)
  // Every editable part of the package — registration fields and the poster
  // alike — freezes once the campaign is published. The server's 409
  // campaign_live is the actual control (assert_editable is the first call in
  // both write paths); this only removes the affordance.
  const registrationLocked = !canManage || campaign?.status === CAMPAIGN_LIVE

  if (eventLoading || scheduleLoading || campaignLoading)
    return <Loading label="Loading campaign builder…" />
  if (eventError) return <ErrorState error={eventErr} />
  // A stepper drawn from a campaign payload that never arrived would show an
  // empty prefix as though it were the truth (E1 backstop, T-05-41), so the
  // whole page fails rather than part of it.
  if (campaignError) return <ErrorState error={campaignErr} />
  if (!e) return <div className="p-8 text-center text-graytext-light">Event not found</div>

  /* The five pipeline steps, straight off the server's completeness object.
   * Recomputing them here from the schedule and form-field queries would be a
   * second definition of "done" that drifts the first time a rule changes. */
  const steps = [
    { id: 'schedule', label: 'Schedule', complete: !!campaign?.completeness.schedule },
    { id: 'mail', label: 'Mail Template', complete: !!campaign?.completeness.mail },
    { id: 'poster', label: 'Poster', complete: !!campaign?.completeness.poster },
    { id: 'registration', label: 'Registration', complete: !!campaign?.completeness.registration },
    { id: 'push-live', label: 'Push Live', complete: campaign?.status === CAMPAIGN_LIVE },
  ]
  const currentStep = (steps.find(s => !s.complete) ?? steps[steps.length - 1]).id

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

  /** The gate reports its own failures — this only announces the success, and
   *  lets the rejection through so the gate can read the 403 off it. */
  const handlePushLive = async () => {
    await pushLiveMut.mutateAsync()
    addToast('Campaign is now live!', 'success')
  }

  /** A new field starts as the first type the server named — the browser has no
   *  opinion about which types exist, so it cannot have a default of its own. */
  const handleAddField = () => {
    const label = newFieldLabel.trim()
    const fieldType = campaign?.formFieldTypes?.[0]
    if (!label || !fieldType) return
    createFieldMut.mutate({ label, fieldType, position: formFields.length }, {
      onSuccess: () => {
        setNewFieldLabel('')
        setAddingField(false)
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

      <PipelineStepper steps={steps} currentStep={currentStep} />

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

      {/* Poster (CAMPAIGN-03) */}
      <Card className="p-6 space-y-3">
        <h2 className="text-[15px] font-semibold text-offwhite">Poster</h2>
        <PosterUpload
          posterName={campaign?.posterName ?? null}
          uploading={uploadPosterMut.isPending}
          disabled={registrationLocked}
          onUpload={file => uploadPosterMut.mutateAsync(file)}
        />
      </Card>

      {/* Registration — custom form fields (CAMPAIGN-05) */}
      <Card className="p-6 space-y-3">
        <h2 className="text-[15px] font-semibold text-offwhite">Registration</h2>
        <p className="text-[13px] text-graytext-light">
          Full name and contact are always collected. Add anything else you need
          from registrants below.
        </p>

        <div>
          {(formFields as ApiFormField[]).map(field => (
            <FormFieldRow
              key={field.id}
              field={field}
              fieldTypes={campaign?.formFieldTypes ?? []}
              disabled={registrationLocked}
              onUpdate={(fieldId, patch) => updateFieldMut.mutateAsync({ fieldId, patch })}
              onDelete={fieldId => deleteFieldMut.mutate(fieldId)}
            />
          ))}
        </div>

        {!registrationLocked && !addingField && (
          <button
            id="campaign-add-form-field"
            onClick={() => setAddingField(true)}
            className="mt-2 w-full rounded-lg border border-dashed border-white/20 py-2 text-[13px] text-graytext-mid hover:border-teal/50 hover:text-teal transition-colors"
          >
            + Add field
          </button>
        )}

        {!registrationLocked && addingField && (
          <div className="mt-2 flex gap-2">
            <input
              id="campaign-new-field-label"
              autoFocus
              value={newFieldLabel}
              onChange={e => setNewFieldLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddField()}
              placeholder="Field label…"
              className="flex-1 rounded-lg border border-white/15 bg-white/6 px-3 py-2 text-[13px] text-offwhite placeholder:text-graytext-mid outline-none focus:border-teal/50"
            />
            <Button
              id="campaign-add-field-submit"
              onClick={handleAddField}
              disabled={createFieldMut.isPending}
            >
              Add
            </Button>
            <Button
              variant="secondary"
              id="campaign-add-field-cancel"
              onClick={() => { setAddingField(false); setNewFieldLabel('') }}
            >
              Cancel
            </Button>
          </div>
        )}

        {createFieldMut.isError && (
          <p role="alert" className="text-caption text-red-300">
            {(createFieldMut.error as Error).message}
          </p>
        )}

        {canManage && (
          <div className="pt-2">
            <RegistrationLinkCard
              registrationUrl={campaign?.registrationUrl ?? null}
              generating={generateSlugMut.isPending}
              onGenerate={() => generateSlugMut.mutateAsync()}
            />
          </div>
        )}
      </Card>

      {/* Publish (CAMPAIGN-06) — the gate is rendered for every crew member;
          only the Meetup Head can operate it, and the server enforces that. */}
      <PushLiveGate
        status={campaign?.status ?? ''}
        isMeetupHead={!!campaign?.isMeetupHead}
        pushedLiveAt={campaign?.pushedLiveAt ?? null}
        publishing={pushLiveMut.isPending}
        onPushLive={handlePushLive}
      />
    </div>
  )
}
