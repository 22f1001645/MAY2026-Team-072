import { useState } from 'react'
import { Badge, Button, Card, Input, useToast } from './ui'
import { usePolls, useCreatePoll } from '../lib/queries'
import { ErrorState } from './states'
import PollCard from './PollCard'
import QuerySection from './QuerySection'

/** Mirrors `PollCreateSchema` (backend/app/schemas/__init__.py) so a malformed
 *  poll is caught before it costs a round trip and a 422 toast. */
const QUESTION_MIN = 5
const QUESTION_MAX = 300
const OPTIONS_MIN = 2
const OPTIONS_MAX = 6

/**
 * CHAT-01 / CHAT-02 — the event channel below the chat: polls now, Q&A next.
 */
export default function EventChannelSection({
  activityId,
  canManage,
  closed = false,
}: {
  activityId: string
  canManage: boolean
  /** The event has completed or been archived: the backend refuses new polls,
   *  votes and questions, so the composers go and the thread stays. The section
   *  is not unmounted, because this is the only surface on which a registrant
   *  reads the answer a team writes after the event (D-17). */
  closed?: boolean
}) {
  const [composing, setComposing] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  const { data: polls = [], isLoading, isError, error } = usePolls(activityId)
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
    <div className="space-y-12">
      {/* Polls Section */}
      <div>
        <h3 className="mb-6 flex items-center gap-3 text-[18px] font-extrabold text-white">
          Event Polls
          {openCount > 0 && <Badge tone="teal" className="px-2 py-0.5 text-[11px]">{openCount} open</Badge>}
        </h3>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-caption text-graytext-mid">Loading polls…</p>
          ) : isError ? (
            <ErrorState error={error} />
          ) : polls.length === 0 ? (
            <p className="text-caption text-graytext-mid">
              {canManage ? 'No polls yet — publish one below.' : 'No polls yet.'}
            </p>
          ) : (
            polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                activityId={activityId}
                canManage={canManage}
                channelClosed={closed}
              />
            ))
          )}

          {canManage &&
            (composing ? (
              <form onSubmit={submitPoll} className="space-y-4 rounded-2xl bg-white/[0.02] p-5 mt-6 shadow-inner">
                <Input
                  value={question}
                  onChange={(ev) => setQuestion(ev.target.value)}
                  maxLength={QUESTION_MAX}
                  placeholder="e.g., What should we order for dinner?"
                  aria-label="Poll question"
                  autoFocus
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
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!canSubmit || createPollMut.isPending}>
                    {createPollMut.isPending ? 'Publishing…' : 'Publish poll'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-6 pt-6 border-t border-white/5">
                <Button variant="secondary" size="sm" onClick={() => setComposing(true)}>
                  + Create poll
                </Button>
              </div>
            ))}
        </div>
      </div>

      {/* Q&A Section */}
      {!canManage && (
        <div>
          <QuerySection activityId={activityId} readOnly={closed} />
        </div>
      )}
    </div>
  )
}
