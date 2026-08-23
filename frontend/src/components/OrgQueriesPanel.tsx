import { useState } from 'react'
import { Badge, Button, Card, Textarea, useToast } from './ui'
import { ErrorState } from './states'
import { useOrgQueries, useRespondQuery } from '../lib/queries'

/** Mirrors `QueryRespondSchema` — the answer bound is wider than the question's. */
const RESPONSE_MAX = 2000

/**
 * CHAT-02 / CHAT-03 — the organising team's view of event Q&A (D-09).
 *
 * Open questions sort to the top: this panel is a work queue, and the thing the
 * team came here to do is answer the ones nobody has answered.
 */
export default function OrgQueriesPanel({ activityId }: { activityId: string }) {
  // One draft per query id — a single shared draft string would put the same
  // half-typed answer under every open question on the list.
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const { data: queries = [], isLoading, isError, error } = useOrgQueries(activityId)
  const respondMut = useRespondQuery()
  const { addToast } = useToast()

  const unansweredCount = queries.filter((q) => q.status === 'open').length

  // Open first, newest first within each group.
  const sorted = [...queries].sort((a, b) =>
    a.status === b.status ? b.at.localeCompare(a.at) : a.status === 'open' ? -1 : 1,
  )

  const sendReply = (queryId: string) => {
    const response_body = (drafts[queryId] ?? '').trim()
    if (!response_body || respondMut.isPending) return
    respondMut.mutate(
      { id: activityId, queryId, response_body },
      {
        onSuccess: () => {
          setDrafts((prev) => ({ ...prev, [queryId]: '' }))
          addToast('Reply sent')
        },
        onError: (err) => addToast((err as Error).message, 'error'),
      },
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-[15px] font-semibold text-offwhite">Attendee Questions &amp; Q&amp;A</h3>
        {unansweredCount > 0 && (
          <Badge tone="warn">
            {unansweredCount} unanswered
          </Badge>
        )}
      </div>

      {isLoading ? (
        <p className="text-caption text-graytext-mid">Loading questions…</p>
      ) : isError ? (
        // Never the empty state on failure: "no questions from attendees yet"
        // told an organiser with confidence that a 403 or a stopped backend was
        // silence from the community.
        <ErrorState error={error} />
      ) : sorted.length === 0 ? (
        <div className="p-10 text-center text-graytext-light">
          No questions from attendees yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((q) => (
            <div key={q.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                {/* `EventQuery` carries `user_id` and no author name (08-02/08-03
                    both flagged it), so the id is shown as an id rather than
                    dressed up as a person the server never named. */}
                <span className="text-caption uppercase tracking-wider text-graytext-mid">
                  Attendee {q.user_id.slice(0, 8)} · {new Date(q.at).toLocaleString()}
                </span>
                <Badge tone={q.status === 'answered' ? 'teal' : 'warn'} className="shrink-0">
                  {q.status === 'answered' ? 'Answered' : 'Open'}
                </Badge>
              </div>

              <p className="text-[14px] leading-snug text-offwhite">{q.body}</p>

              {q.status === 'open' ? (
                <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                  <Textarea
                    value={drafts[q.id] ?? ''}
                    onChange={(ev) =>
                      setDrafts((prev) => ({ ...prev, [q.id]: ev.target.value }))
                    }
                    maxLength={RESPONSE_MAX}
                    rows={2}
                    placeholder="Answer this question…"
                    aria-label={`Reply to question from attendee ${q.user_id.slice(0, 8)}`}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!(drafts[q.id] ?? '').trim() || respondMut.isPending}
                      onClick={() => sendReply(q.id)}
                    >
                      {respondMut.isPending ? 'Sending…' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border-l-2 border-teal/50 bg-teal/[0.05] py-2 pl-3 pr-2.5">
                  <p className="text-caption uppercase tracking-wider text-teal">
                    Answered
                    {q.responded_by && ` by ${q.responded_by.slice(0, 8)}`}
                    {q.responded_at && ` · ${new Date(q.responded_at).toLocaleString()}`}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-graytext-light">
                    {q.response_body}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
