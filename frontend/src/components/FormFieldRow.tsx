/**
 * FormFieldRow — one auto-saving custom registration field (CAMPAIGN-05).
 *
 * Design contract: UI-SPEC §3 (Registration section). The save mechanics are
 * ScheduleRow's, deliberately: blur saves one key, an empty label is not a
 * save, "Saving…" holds then unmounts, a rejection reverts and says so.
 *
 * Two things differ from ScheduleRow:
 *
 *  - `duplicate_label` is rendered inline beneath the label input instead of as
 *    a toast. It is the one rejection the organiser can act on, and a toast
 *    would not say which of several rows collided. The rejected text is left on
 *    screen for the same reason — reverting it would delete the thing they need
 *    to edit.
 *  - The type options come from `fieldTypes`, which the server puts on the
 *    campaign payload (`form_field_types` ← `constants.FORM_FIELD_TYPES`). The
 *    allowed set is never written down here: FormFieldSchema's 422 is the
 *    authority, and a second copy in the browser is the drift the frontend's
 *    no-por-literals gate exists to prevent.
 */
import { useEffect, useRef, useState } from 'react'
import { Input, Select, useToast } from './ui'
import { cx } from '../lib/format'
import type { ApiFormField } from '../lib/types'

/** The one type whose `options` column is meaningful. This is a rendering rule
 *  — which control to draw — not a copy of the allowed set, which arrives in
 *  `fieldTypes`. */
const DROPDOWN_TYPE = 'dropdown'

export interface FormFieldRowProps {
  field: ApiFormField
  /** Allowed type values, as named by the server. */
  fieldTypes: string[]
  onUpdate: (id: string, patch: Partial<ApiFormField>) => Promise<unknown>
  onDelete: (id: string) => void
  disabled?: boolean
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function FormFieldRow({
  field,
  fieldTypes,
  onUpdate,
  onDelete,
  disabled = false,
}: FormFieldRowProps) {
  const { addToast } = useToast()
  const [label, setLabel] = useState(field.label)
  const [fieldType, setFieldType] = useState(field.fieldType)
  const [optionsText, setOptionsText] = useState((field.options ?? []).join(', '))
  const [lastSaved, setLastSaved] = useState({
    label: field.label,
    fieldType: field.fieldType,
    optionsText: (field.options ?? []).join(', '),
  })
  const [labelError, setLabelError] = useState<string | null>(null)
  const [savePhase, setSavePhase] = useState<'idle' | 'active' | 'fading'>('idle')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  const markSaved = () => {
    timersRef.current = [
      setTimeout(() => setSavePhase('fading'), 800),
      setTimeout(() => setSavePhase('idle'), 1300),
    ]
  }

  const save = async (
    patch: Partial<ApiFormField>,
    revert: () => void,
    onSaved: () => void,
  ) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setSavePhase('active')
    try {
      await onUpdate(field.id, patch)
      onSaved()
      setLabelError(null)
      markSaved()
    } catch (err) {
      setSavePhase('idle')
      // Duck-typed rather than `instanceof ApiError`: the code is what the
      // server sent, and it survives the value crossing a module boundary.
      if ((err as { code?: string })?.code === 'duplicate_label') {
        setLabelError((err as Error).message)
        return
      }
      revert()
      addToast('Failed to save', 'error')
    }
  }

  const saveLabel = (value: string) => {
    if (!value.trim()) {
      setLabel(lastSaved.label)
      return
    }
    if (value === lastSaved.label) return
    save({ label: value }, () => setLabel(lastSaved.label), () =>
      setLastSaved(s => ({ ...s, label: value })),
    )
  }

  const saveType = (value: string) => {
    if (value === lastSaved.fieldType) return
    setFieldType(value)
    save({ fieldType: value }, () => setFieldType(lastSaved.fieldType), () =>
      setLastSaved(s => ({ ...s, fieldType: value })),
    )
  }

  const saveOptions = (value: string) => {
    if (value === lastSaved.optionsText) return
    const options = value
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
    save({ options }, () => setOptionsText(lastSaved.optionsText), () =>
      setLastSaved(s => ({ ...s, optionsText: value })),
    )
  }

  return (
    <div className="flex items-start gap-3 group py-3 border-b border-divider">
      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <Input
          value={label}
          placeholder="Field label"
          className="flex-1 truncate"
          readOnly={disabled}
          onChange={e => setLabel(e.target.value)}
          onBlur={e => saveLabel(e.target.value)}
        />

        {labelError && (
          <p role="alert" className="text-red-300 text-caption">
            {labelError}
          </p>
        )}

        {fieldType === DROPDOWN_TYPE && (
          <Input
            value={optionsText}
            placeholder="Small, Medium, Large"
            className="mt-1 text-[13px]"
            readOnly={disabled}
            onChange={e => setOptionsText(e.target.value)}
            onBlur={e => saveOptions(e.target.value)}
          />
        )}

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

      {/* Type control. Live campaigns get the value as text rather than a
          disabled select — the same "remove the control that never applies"
          rule ScheduleRow's arrows follow. */}
      {disabled ? (
        <span className="w-40 shrink-0 pt-2.5 text-[13px] text-graytext-light">
          {titleCase(fieldType)}
        </span>
      ) : (
        <Select
          ariaLabel="Field type"
          className="w-40 shrink-0"
          value={fieldType}
          onChange={e => saveType(e.target.value)}
          options={fieldTypes.map(t => ({ label: titleCase(t), value: t }))}
        />
      )}

      {!disabled && (
        <button
          aria-label={`Remove field ${field.label}`}
          onClick={() => onDelete(field.id)}
          className="shrink-0 mt-2 p-1 rounded text-red-300 opacity-0 group-hover:opacity-100 transition"
        >
          ✕
        </button>
      )}
    </div>
  )
}
