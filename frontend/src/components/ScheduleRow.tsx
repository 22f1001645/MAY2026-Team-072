/**
 * ScheduleRow — one auto-saving, reorderable row in the event agenda editor.
 *
 * Design contract: UI-SPEC §2.2 / E2.
 * - Blur on title, time-block, or notes fires onUpdate with ONLY that field.
 * - An empty title on blur does NOT save (restores last-saved value).
 * - Saving indicator: "Saving…" fades out 800ms after resolve.
 * - On reject: restore lastSaved value + error toast "Failed to save".
 * - isFirst hides Move up; isLast hides Move down; disabled hides both + delete.
 * - No text-danger, no field-sizing, no refetchInterval.
 */
import React, { useRef, useState } from 'react'
import { Input, Textarea } from './ui'
import { useToast } from './ui'
import { cx } from '../lib/format'
import type { ApiScheduleItem } from '../lib/types'

export interface ScheduleRowProps {
  item: ApiScheduleItem
  onUpdate: (id: string, patch: Partial<ApiScheduleItem>) => Promise<unknown>
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  isFirst: boolean
  isLast: boolean
  disabled?: boolean
}

type Draft = { timeBlock: string; title: string; notes: string }

export function ScheduleRow({
  item,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  disabled = false,
}: ScheduleRowProps) {
  const { addToast } = useToast()
  const [draft, setDraft] = useState<Draft>({
    timeBlock: item.timeBlock ?? '',
    title: item.title,
    notes: item.notes ?? '',
  })
  const [lastSaved, setLastSaved] = useState<Draft>({ ...draft })
  const [saving, setSaving] = useState(false)
  const [savingVisible, setSavingVisible] = useState(false)
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showNotes, setShowNotes] = useState(!!item.notes)

  const triggerSave = async (field: keyof Draft, value: string) => {
    if (field === 'title' && !value.trim()) {
      // Revert — do not save an empty title
      setDraft(d => ({ ...d, title: lastSaved.title }))
      return
    }
    if (value === lastSaved[field]) return

    setSaving(true)
    setSavingVisible(true)
    try {
      await onUpdate(item.id, { [field]: value })
      setLastSaved(d => ({ ...d, [field]: value }))
      // Fade indicator out after 800ms
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current)
      savingTimerRef.current = setTimeout(() => setSavingVisible(false), 800)
    } catch {
      // Revert field to last-saved value
      setDraft(d => ({ ...d, [field]: lastSaved[field] }))
      addToast('Failed to save', 'error')
      setSavingVisible(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-start gap-3 group py-3 border-b border-divider">
      {/* Reorder controls */}
      {!disabled && (
        <div className="flex flex-col gap-0.5 mt-1 shrink-0">
          <button
            aria-label="Move up"
            onClick={() => onMoveUp(item.id)}
            disabled={isFirst}
            className="p-0.5 rounded text-graytext-light hover:text-teal disabled:opacity-30 transition"
          >
            ▲
          </button>
          <button
            aria-label="Move down"
            onClick={() => onMoveDown(item.id)}
            disabled={isLast}
            className="p-0.5 rounded text-graytext-light hover:text-teal disabled:opacity-30 transition"
          >
            ▼
          </button>
        </div>
      )}

      {/* Time block */}
      <Input
        value={draft.timeBlock}
        placeholder="10:00–10:30"
        className="w-32 shrink-0"
        readOnly={disabled}
        onChange={e => setDraft(d => ({ ...d, timeBlock: e.target.value }))}
        onBlur={e => triggerSave('timeBlock', e.target.value)}
      />

      {/* Title + notes column */}
      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <Input
          value={draft.title}
          placeholder="e.g. Opening remarks"
          className="flex-1 truncate"
          readOnly={disabled}
          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
          onBlur={e => triggerSave('title', e.target.value)}
        />

        {/* Notes toggle */}
        {!showNotes && !disabled && (
          <button
            className="self-start text-caption text-graytext-light hover:text-teal transition"
            onClick={() => setShowNotes(true)}
          >
            + notes
          </button>
        )}

        {showNotes && (
          <div
            className={cx(
              'overflow-hidden transition-all duration-300',
              showNotes ? 'max-h-[200px]' : 'max-h-0',
            )}
          >
            <Textarea
              value={draft.notes}
              placeholder="Session notes…"
              rows={2}
              readOnly={disabled}
              className="mt-1 text-[13px]"
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              onBlur={e => triggerSave('notes', e.target.value)}
            />
          </div>
        )}

        {/* Saving indicator */}
        <span
          className={cx(
            'text-caption text-teal transition-opacity duration-500',
            savingVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          Saving…
        </span>
      </div>

      {/* Delete button */}
      {!disabled && (
        <button
          aria-label="Delete schedule item"
          onClick={() => onDelete(item.id)}
          className="shrink-0 mt-1 p-1 rounded text-red-300 opacity-0 group-hover:opacity-100 transition"
        >
          ✕
        </button>
      )}
    </div>
  )
}
