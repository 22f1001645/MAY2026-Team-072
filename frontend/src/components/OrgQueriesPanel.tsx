import { useState } from 'react'
import { Badge, Button, Card, Textarea, useToast } from './ui'
import { ErrorState } from './states'
import { useOrgQueries, useRespondQuery } from '../lib/queries'

const RESPONSE_MAX = 2000

export default function OrgQueriesPanel({ activityId }: { activityId: string }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)

  const { data: queries = [], isLoading, isError, error } = useOrgQueries(activityId)
  const respondMut = useRespondQuery()
  const { addToast } = useToast()

  const unansweredCount = queries.filter((q) => q.status === 'open').length

  const sorted = [...queries].sort((a, b) =>
    a.status === b.status ? b.at.localeCompare(a.at) : a.status === 'open' ? -1 : 1,
  )

  const sendReply = (queryId: string) => {
    const response_body = (drafts[queryId] ?? '').trim()
    if (!response_body || sendingId === queryId) return
    setSendingId(queryId)
    respondMut.mutate(
      { id: activityId, queryId, response_body },
      {
        onSuccess: () => {
          setDrafts((prev) => ({ ...prev, [queryId]: '' }))
          addToast('Reply sent')
        },
        onError: (err) => addToast((err as Error).message, 'error'),
        onSettled: () => setSendingId((current) => (current === queryId ? null : current)),
      },
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-offwhite flex items-center gap-2">
          Attendee Q&A
          {unansweredCount > 0 && (
            <Badge tone="warn" className="scale-90 origin-left">
              {unansweredCount} New
            </Badge>
          )}
        </h3>
      </div>

      {isLoading ? (
        <p className="text-caption text-graytext-mid">Loading questions...</p>
      ) : isError ? (
        <ErrorState error={error} />
      ) : sorted.length === 0 ? (
        <div className="p-10 text-center text-graytext-light">
          No questions from attendees yet.
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((q) => (
            <div key={q.id} className="flex flex-col gap-3 py-3 border-b border-white/5 last:border-0 last:pb-0">
              
              {/* Question Bubble (Left) */}
              <div className="flex flex-col items-start pr-12">
                <div className="flex items-center gap-2 mb-1 pl-1">
                  <span className="text-[11px] font-medium text-graytext-mid uppercase tracking-wider">
                    Attendee {q.user_id.slice(0, 8)} · {new Date(q.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[14px] text-offwhite max-w-[90%] shadow-sm">
                  {q.body}
                </div>
              </div>

              {/* Answer Bubble (Right) */}
              {q.status === 'answered' ? (
                <div className="flex flex-col items-end pl-12">
                  <div className="flex items-center gap-2 mb-1 pr-1">
                    <span className="text-[11px] font-medium text-teal/80 uppercase tracking-wider">
                      Organising Team {q.responded_by && `(${q.responded_by.slice(0, 8)})`} · {q.responded_at && new Date(q.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-teal/20 text-teal-50 border border-teal/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] max-w-[90%] shadow-sm">
                    {q.response_body}
                  </div>
                </div>
              ) : (
                /* Unanswered State (Input field on the right) */
                <div className="flex flex-col items-end pl-12 mt-1">
                  <div className="w-full max-w-[90%] bg-black/40 border border-white/10 rounded-2xl rounded-tr-sm p-3 shadow-inner">
                    <Textarea
                      value={drafts[q.id] ?? ''}
                      onChange={(ev) =>
                        setDrafts((prev) => ({ ...prev, [q.id]: ev.target.value }))
                      }
                      maxLength={RESPONSE_MAX}
                      rows={2}
                      placeholder="Type your reply..."
                      className="bg-transparent border-none p-0 focus:ring-0 resize-none text-[14px] text-offwhite placeholder:text-graytext-mid"
                      aria-label={`Reply to question from attendee ${q.user_id.slice(0, 8)}`}
                    />
                    <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                      <span className="text-[11px] text-graytext-mid">
                        {RESPONSE_MAX - (drafts[q.id]?.length || 0)} chars left
                      </span>
                      <Button
                        size="sm"
                        className="py-1 px-4 h-auto text-[12px] bg-teal hover:bg-teal-400 text-onyx font-bold rounded-full"
                        disabled={!(drafts[q.id] ?? '').trim() || sendingId === q.id}
                        onClick={() => sendReply(q.id)}
                      >
                        {sendingId === q.id ? 'Sending...' : 'Reply'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
