import { useState, useEffect } from 'react'
import { Badge, Button, Card, Textarea, useToast } from './ui'
import { ErrorState } from './states'
import { useOrgQueries, useRespondQuery } from '../lib/queries'
import { cx } from '../lib/format'

const RESPONSE_MAX = 2000

export default function OrgQueriesPanel({ activityId }: { activityId: string }) {
  const [draft, setDraft] = useState('')
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const { data: queries = [], isLoading, isError, error } = useOrgQueries(activityId)
  const respondMut = useRespondQuery()
  const { addToast } = useToast()

  const unansweredCount = queries.filter((q) => q.status === 'open').length

  const sorted = [...queries].sort((a, b) =>
    a.status === b.status ? b.at.localeCompare(a.at) : a.status === 'open' ? -1 : 1,
  )

  // Auto-select the oldest unanswered query by default
  useEffect(() => {
    if (!selectedQueryId) {
      const openQueries = sorted.filter(q => q.status === 'open')
      if (openQueries.length > 0) {
        // Sorted puts oldest open queries at the end of the open block, actually wait, 
        // the sort logic: open first, then answered. Within same status, b.at.localeCompare(a.at) means newest first!
        // So openQueries[openQueries.length - 1] is the oldest open query.
        setSelectedQueryId(openQueries[openQueries.length - 1].id)
      }
    }
  }, [sorted, selectedQueryId])

  const sendReply = () => {
    if (!selectedQueryId) return
    const response_body = draft.trim()
    if (!response_body || sendingId === selectedQueryId) return
    
    setSendingId(selectedQueryId)
    respondMut.mutate(
      { id: activityId, queryId: selectedQueryId, response_body },
      {
        onSuccess: () => {
          setDraft('')
          setSelectedQueryId(null)
          addToast('Reply sent')
        },
        onError: (err) => addToast((err as Error).message, 'error'),
        onSettled: () => setSendingId(null),
      },
    )
  }

  const selectedQuery = sorted.find(q => q.id === selectedQueryId)

  return (
    <Card className="flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/5 shrink-0 flex items-center justify-between bg-white/[0.02]">
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
        <div className="p-10 text-center text-caption text-graytext-mid">Loading questions...</div>
      ) : isError ? (
        <div className="p-5"><ErrorState error={error} /></div>
      ) : sorted.length === 0 ? (
        <div className="p-10 text-center text-graytext-light m-auto">
          No questions from attendees yet.
        </div>
      ) : (
        <>
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col items-center">
            <div className="w-full max-w-[600px] flex flex-col gap-6">
              {sorted.map((q) => (
                <div key={q.id} className="flex flex-col gap-3">
                  
                  {/* Question Bubble (Left) */}
                  <div 
                    className={cx(
                      "flex flex-col items-start pr-12 transition-all cursor-pointer rounded-2xl p-1 -m-1",
                      selectedQueryId === q.id && q.status === 'open' ? "bg-white/5 ring-1 ring-white/10" : "hover:bg-white/[0.02]"
                    )}
                    onClick={() => q.status === 'open' && setSelectedQueryId(q.id)}
                  >
                    <div className="flex items-center gap-2 mb-1 pl-1">
                      <span className="text-[11px] font-medium text-graytext-mid uppercase tracking-wider">
                        Attendee · {new Date(q.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={cx(
                      "rounded-2xl rounded-tl-sm px-4 py-2.5 text-[14px] text-offwhite max-w-[90%] shadow-sm",
                      q.status === 'open' ? "bg-white/15" : "bg-white/10"
                    )}>
                      {q.body}
                    </div>
                  </div>

                  {/* Answer Bubble (Right) */}
                  {q.status === 'answered' && (
                    <div className="flex flex-col items-end pl-12">
                      <div className="flex items-center gap-2 mb-1 pr-1">
                        <span className="text-[11px] font-medium text-teal/80 uppercase tracking-wider">
                          Organising Team · {q.responded_at && new Date(q.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="bg-teal/20 text-teal-50 border border-teal/20 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] max-w-[90%] shadow-sm">
                        {q.response_body}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Input Footer */}
          <div className="p-4 border-t border-white/5 bg-black/40 shrink-0 flex justify-center">
            <div className="w-full max-w-[600px]">
              {selectedQuery ? (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 shadow-inner focus-within:ring-1 focus-within:ring-teal/50 focus-within:border-teal/50 transition-all">
                  <div className="mb-2 text-[11px] text-teal/80 uppercase tracking-wider font-semibold px-1 flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                    Replying to Attendee's question
                  </div>
                  <Textarea
                    value={draft}
                    onChange={(ev) => setDraft(ev.target.value)}
                    maxLength={RESPONSE_MAX}
                    rows={2}
                    placeholder="Type your reply..."
                    className="bg-transparent border-none p-1 focus:ring-0 resize-none text-[14px] text-offwhite placeholder:text-graytext-mid"
                  />
                  <div className="flex justify-between items-center mt-2 pt-2">
                    <span className="text-[11px] text-graytext-mid pl-1">
                      {RESPONSE_MAX - draft.length} chars left
                    </span>
                    <Button
                      size="sm"
                      className="py-1.5 px-5 h-auto text-[12px] bg-teal hover:bg-teal-400 text-onyx font-bold rounded-full"
                      disabled={!draft.trim() || sendingId === selectedQueryId}
                      onClick={sendReply}
                    >
                      {sendingId === selectedQueryId ? 'Sending...' : 'Send Reply'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-[13px] text-graytext-mid py-4">
                  {unansweredCount > 0 
                    ? "Click on an unanswered question above to reply." 
                    : "All questions have been answered!"}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
