/**
 * MailTemplateEditor — the campaign mail draft, editable in place.
 *
 * Design contract: UI-SPEC §2.5 / §5 / §6 / E5, decision D-05.
 *
 * The draft the server returns is a STARTING POINT, not an answer. It lands in
 * an ordinary Textarea the organiser edits and saves on blur, exactly as
 * ScheduleRow does — same blur-save, same "Saving…" caption, same revert-and-
 * toast on rejection — so the two editors on this page feel like one system
 * rather than two features that happened to ship in the same phase.
 *
 * The amber banner is the whole reason `degraded` travels on the response. The
 * body is assembled unconditionally on the server, so a failed generation still
 * produces a usable draft; without the banner the organiser would have no way to
 * tell a model-written invitation from the static fallback, and would ship the
 * fallback believing it was the good one.
 *
 * Subject and body fall back to their own placeholders INDEPENDENTLY. A response
 * that populated only one of them must not blank the other — that is E5's
 * `partial` row, and the reason there is no single `hasContent` flag here.
 *
 * Sizing note: `field-sizing: content` is a Tailwind 4 utility and this project
 * pins Tailwind 3.4, so the growth affordance is the stated alternative — a
 * minimum height, no maximum-height cap, and the native resize handle left on.
 */
import { useEffect, useRef, useState } from 'react'

import { cx } from '../lib/format'
import { Button, Input, Textarea, useToast } from './ui'

export const MAIL_BODY_PLACEHOLDER =
  'Your mail template will appear here after generation.'
export const MAIL_SUBJECT_PLACEHOLDER =
  'Your subject line will appear here after generation.'
export const MAIL_DEGRADED_NOTICE =
  'AI unavailable — this is a base template. Edit as needed.'

export interface MailTemplateEditorProps {
  mailSubject: string | null
  mailBody: string | null
  /** True when the last generation fell back to the static template. */
  degraded: boolean
  generating: boolean
  onGenerate: () => Promise<unknown>
  onSave: (patch: { mailSubject?: string; mailBody?: string }) => Promise<unknown>
  disabled?: boolean
}

type Draft = { subject: string; body: string }

export function MailTemplateEditor({
  mailSubject,
  mailBody,
  degraded,
  generating,
  onGenerate,
  onSave,
  disabled = false,
}: MailTemplateEditorProps) {
  const { addToast } = useToast()
  const [draft, setDraft] = useState<Draft>({
    subject: mailSubject ?? '',
    body: mailBody ?? '',
  })
  const [lastSaved, setLastSaved] = useState<Draft>({ ...draft })
  const [savePhase, setSavePhase] = useState<'idle' | 'active' | 'fading'>('idle')
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  // A generation replaces the server's copy, and the query invalidation brings
  // it back down as new props. Adopt it — but per field, so a response that
  // carried only a body cannot wipe a subject that is already on screen.
  useEffect(() => {
    const next = { subject: mailSubject ?? '', body: mailBody ?? '' }
    setDraft(d => ({
      subject: mailSubject !== null ? next.subject : d.subject,
      body: mailBody !== null ? next.body : d.body,
    }))
    setLastSaved(d => ({
      subject: mailSubject !== null ? next.subject : d.subject,
      body: mailBody !== null ? next.body : d.body,
    }))
  }, [mailSubject, mailBody])

  const triggerSave = async (field: keyof Draft, value: string) => {
    if (value === lastSaved[field]) return

    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setSavePhase('active')
    try {
      await onSave(
        field === 'subject' ? { mailSubject: value } : { mailBody: value },
      )
      setLastSaved(d => ({ ...d, [field]: value }))
      timersRef.current = [
        setTimeout(() => setSavePhase('fading'), 800),
        setTimeout(() => setSavePhase('idle'), 1300),
      ]
    } catch {
      // Revert to the last value the server acknowledged. An edit left on screen
      // after a failed save is an edit the organiser believes they have.
      setDraft(d => ({ ...d, [field]: lastSaved[field] }))
      addToast('Failed to save', 'error')
      setSavePhase('idle')
    }
  }

  const handleGenerate = async () => {
    try {
      await onGenerate()
      addToast('Mail template generated', 'success')
    } catch {
      addToast('Failed to generate. Try again.', 'error')
    }
  }

  const hasBody = !!mailBody
  const busy = generating || disabled

  return (
    <div className="space-y-3">
      {degraded && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-amber-400/8 border border-amber-400/25 px-4 py-3 text-amber-300 text-[13px] mb-4"
        >
          <span aria-hidden="true">⚠</span>
          {MAIL_DEGRADED_NOTICE}
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-caption text-graytext-mid">Subject</span>
        <Input
          value={draft.subject}
          placeholder={MAIL_SUBJECT_PLACEHOLDER}
          readOnly={disabled}
          disabled={generating}
          onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
          onBlur={e => triggerSave('subject', e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-caption text-graytext-mid">Body</span>
        <Textarea
          value={draft.body}
          placeholder={MAIL_BODY_PLACEHOLDER}
          readOnly={disabled}
          disabled={generating}
          /* No max-height and resize left on: a full invitation is long, and a
             capped box would make the organiser scroll a window inside a page. */
          className="min-h-[240px] resize-y font-mono text-[13px]"
          onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
          onBlur={e => triggerSave('body', e.target.value)}
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <span
          className={cx(
            'text-caption text-teal transition-opacity duration-500',
            savePhase === 'fading' ? 'opacity-0' : 'opacity-100',
            savePhase === 'idle' && 'invisible',
          )}
        >
          {savePhase === 'idle' ? '' : 'Saving…'}
        </span>
        <span className="text-caption text-graytext-mid">
          {draft.body.length} characters
        </span>
      </div>

      {!disabled && (
        <Button
          variant={hasBody ? 'ghost' : 'primary'}
          size={hasBody ? 'sm' : 'md'}
          disabled={busy}
          onClick={handleGenerate}
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <svg
                aria-hidden="true"
                className="animate-spin"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M12 3a9 9 0 1 0 9 9" />
              </svg>
              Generating…
            </span>
          ) : hasBody ? (
            'Regenerate'
          ) : (
            'Generate mail template'
          )}
        </Button>
      )}
    </div>
  )
}
