import { useState } from 'react'
import { Badge, Button, Card, Input, useToast } from './ui'
import { usePolls, useCreatePoll } from '../lib/queries'
import PollCard from './PollCard'
import { cx } from '../lib/format'

/** Mirrors `PollCreateSchema` (backend/app/schemas/__init__.py) so a malformed
 *  poll is caught before it costs a round trip and a 422 toast. */
const QUESTION_MIN = 5
const QUESTION_MAX = 300
const OPTIONS_MIN = 2
const OPTIONS_MAX = 6

/**
 * CHAT-01 / CHAT-02 — the event channel below the chat: polls now, Q&A next.
 *
 * Collapsible because it sits in the event sidebar under the chat button; a
 * registrant who wants the venue and the map should not have to scroll past
 * four poll cards to reach them.
 */
export default function EventChannelSection({
  activityId,
  canManage,
}: {
  activityId: string
  canManage: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [composing, setComposing] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const { data: polls = [], isLoading } = usePolls(activityId)
  const createPollMut = useCreatePoll()
  const { addToast } = useToast()

  const openCount = polls.filter((p) => p.status === 'open').length

  const trimmed = options.map((o) => o.trim())
  const filled = trimmed.filter(Boolean)
  const canSubmit =
    question.trim().length >= QUESTION_MIN &&
    question.trim().length <= QUESTION_MAX &&
    filled.length === trimmed.length &&
    filled.length >= OPTIONS_MIN

  const resetForm = () => {
    setQuestion('')
    setOptions(['', ''])
    setComposing(false)
  }

  const submitPoll = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!canSubmit || createPollMut.isPending) return
    createPollMut.mutate(
      { id: activityId, question: question.trim(), options: trimmed },
      {
        // Render from the invalidated list, never from this result: the create
        // route answers with the poll row alone, without `vote_counts`/`my_vote`.
        onSuccess: () => {
          resetForm()
          addToast('Poll published')
        },
        onError: (err) => addToast((err as Error).message, 'error'),
      },
    )
  }

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-[14px] font-semibold text-offwhite">
          Event Polls &amp; Q&amp;A
          {openCount > 0 && <Badge tone="teal">{openCount} open</Badge>}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cx('shrink-0 text-graytext-mid transition-transform', expanded && 'rotate-180')}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-caption text-graytext-mid">Loading polls…</p>
          ) : polls.length === 0 ? (
            <p className="text-caption text-graytext-mid">
              {canManage ? 'No polls yet — publish one below.' : 'No polls yet.'}
            </p>
          ) : (
            polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} activityId={activityId} canManage={canManage} />
            ))
          )}

          {canManage &&
            (composing ? (
              <form onSubmit={submitPoll} className="space-y-2 rounded-xl border border-teal/20 bg-teal/[0.04] p-4">
                <Input
                  value={question}
                  onChange={(ev) => setQuestion(ev.target.value)}
                  maxLength={QUESTION_MAX}
                  placeholder="Ask the attendees something…"
                  aria-label="Poll question"
                />
                {options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(ev) =>
                        setOptions((prev) => prev.map((o, j) => (j === i ? ev.target.value : o)))
                      }
                      maxLength={100}
                      placeholder={`Option ${i + 1}`}
                      aria-label={`Poll option ${i + 1}`}
                    />
                    {options.length > OPTIONS_MIN && (
                      <button
                        type="button"
                        onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove option ${i + 1}`}
                        className="shrink-0 rounded-full p-1.5 text-graytext-mid transition-colors hover:bg-white/5 hover:text-offwhite"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {options.length < OPTIONS_MAX && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setOptions((prev) => [...prev, ''])}>
                    + Add option
                  </Button>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!canSubmit || createPollMut.isPending}>
                    {createPollMut.isPending ? 'Publishing…' : 'Publish poll'}
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => setComposing(true)}>
                Create poll
              </Button>
            ))}

          {/* TODO(08-05): the Q&A sub-section mounts here. `QuerySection.tsx`
           *  does not exist yet — plan 08-05 creates it, and this plan ran
           *  ahead of it. Wiring is two lines:
           *    import QuerySection from './QuerySection'
           *    <div className="border-t border-white/5 pt-3"><QuerySection activityId={activityId} /></div>
           *  Nothing is rendered in the meantime, deliberately: a "coming soon"
           *  placeholder would be a stub attendees can see. */}
        </div>
      )}
    </Card>
  )
}
