/**
 * ScheduleRow — one auto-saving, reorderable row in the event agenda editor.
 *
 * Design contract: UI-SPEC §2.2 / E2.
 * - Blur on title, time-block, or notes fires onUpdate with ONLY that field.
 * - An empty title on blur does NOT save (restores last-saved value).
 * - Saving indicator: "Saving…" fades out 800ms after resolve.
 * - On reject: restore lastSaved value + error toast "Failed to save".
 * - isFirst hides Move up; isLast hides Move down; disabled hides both + delete.
 * Token notes: the delete control uses text-red-300 (the Badge "danger" tone's
 * actual colour — there is no danger text token in tailwind.config.js), and the
 * notes field is sized with an explicit clamp because Tailwind 3.4 has no
 * content-based field sizing utility.
 */
import React, { useEffect, useRef, useState } from 'react'
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
  const [savePhase, setSavePhase] = useState<'idle' | 'active' | 'fading'>('idle')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const [showNotes, setShowNotes] = useState(!!item.notes)

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  const triggerSave = async (field: keyof Draft, value: string) => {
    if (field === 'title' && !value.trim()) {
      // Revert — do not save an empty title
      setDraft(d => ({ ...d, title: lastSaved.title }))
      return
    }
    if (value === lastSaved[field]) return

    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setSavePhase('active')
    try {
      await onUpdate(item.id, { [field]: value } as Partial<ApiScheduleItem>)
      setLastSaved(d => ({ ...d, [field]: value }))
      // Hold the caption for 800ms, fade it over 500ms, then unmount it — the
      // caption is gone from the DOM once saved, not just transparent.
      timersRef.current = [
        setTimeout(() => setSavePhase('fading'), 800),
        setTimeout(() => setSavePhase('idle'), 1300),
      ]
    } catch {
      // Revert field to last-saved value
      setDraft(d => ({ ...d, [field]: lastSaved[field] }))
      addToast('Failed to save', 'error')
      setSavePhase('idle')
    }
  }

  return (
    <div className="flex items-start gap-3 group py-3 border-b border-divider">
      {/* Reorder controls */}
      {!disabled && (
        <div className="flex flex-col gap-0.5 mt-1 shrink-0">
          {!isFirst && (
            <button
              aria-label="Move up"
              onClick={() => onMoveUp(item.id)}
              className="p-0.5 rounded text-graytext-light hover:text-teal transition"
            >
              ▲
            </button>
          )}
          {!isLast && (
            <button
              aria-label="Move down"
              onClick={() => onMoveDown(item.id)}
              className="p-0.5 rounded text-graytext-light hover:text-teal transition"
            >
              ▼
            </button>
          )}
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
        {savePhase !== 'idle' && (
          <span
            className={cx(
              'text-caption text-teal transition-opacity duration-500',
              savePhase === 'fading' ? 'opacity-0' : 'opacity-100',
            )}
          >
            Saving…
          </span>
        )}
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
