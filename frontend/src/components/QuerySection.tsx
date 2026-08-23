import { useState } from 'react'
import { Badge, Button, Textarea, useToast } from './ui'
import { useMyQueries, useSubmitQuery } from '../lib/queries'

/** Mirrors `QuerySubmitSchema` (backend/app/schemas/__init__.py) — the 5-char
 *  floor is the server's, restated so a stray keypress costs no round trip. */
const BODY_MIN = 5
const BODY_MAX = 1000

/**
 * CHAT-02 — the registrant's half of event Q&A.
 *
 * Deliberately scoped to `useMyQueries`: `/queries/mine` returns only the
 * caller's own questions (D-11), so a question about a dietary requirement is
 * never a thing the rest of the attendees read.
 */
export default function QuerySection({ activityId }: { activityId: string }) {
  const [body, setBody] = useState('')

  const { data: queries = [], isLoading } = useMyQueries(activityId)
  const submitMut = useSubmitQuery()
  const { addToast } = useToast()

  const trimmed = body.trim()
  const canSubmit = trimmed.length >= BODY_MIN && trimmed.length <= BODY_MAX

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!canSubmit || submitMut.isPending) return
    submitMut.mutate(
      { id: activityId, body: trimmed },
      {
        onSuccess: () => {
          setBody('')
          addToast('Question sent to the organising team')
        },
        onError: (err) => addToast((err as Error).message, 'error'),
      },
    )
  }

  return (
    <section className="space-y-3">
      <h4 className="text-[14px] font-semibold text-offwhite">Ask the organising team</h4>

      <form onSubmit={submit} className="space-y-2">
        <Textarea
          value={body}
          onChange={(ev) => setBody(ev.target.value)}
          maxLength={BODY_MAX}
          rows={3}
          placeholder="Is there parking near the venue?"
          aria-label="Your question"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-graytext-mid">
            {trimmed.length < BODY_MIN
              ? `At least ${BODY_MIN} characters`
              : `${body.length}/${BODY_MAX}`}
          </span>
          <Button type="submit" size="sm" disabled={!canSubmit || submitMut.isPending}>
            {submitMut.isPending ? 'Sending…' : 'Send question'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-caption text-graytext-mid">Loading your questions…</p>
      ) : queries.length === 0 ? (
        <p className="text-caption text-graytext-mid">
          No questions asked yet. Have a question about logistics or food? Ask the organizing team
          here.
        </p>
      ) : (
        <div className="space-y-2.5">
          {queries.map((q) => (
            <div key={q.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <p className="text-[13px] leading-snug text-offwhite">{q.body}</p>
                <Badge tone={q.status === 'answered' ? 'teal' : 'warn'} className="shrink-0">
                  {q.status === 'answered' ? 'Answered' : 'Open'}
                </Badge>
              </div>
              <p className="text-caption text-graytext-mid">{new Date(q.at).toLocaleString()}</p>

              {q.response_body && (
                <div className="mt-2.5 rounded-lg border-l-2 border-teal/50 bg-teal/[0.05] py-2 pl-3 pr-2.5">
                  <p className="text-caption uppercase tracking-wider text-teal">Organising team</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-graytext-light">
                    {q.response_body}
                  </p>
                  {q.responded_at && (
                    <p className="mt-1.5 text-caption text-graytext-mid">
                      {new Date(q.responded_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
