import { useState, useRef, useEffect } from 'react'
import { Badge, Button, Card, Textarea, useToast } from './ui'
import { ErrorState } from './states'
import { useMyQueries, useSubmitQuery } from '../lib/queries'
import { cx } from '../lib/format'

const BODY_MIN = 5
const BODY_MAX = 1000

export default function QuerySection({
  activityId,
  readOnly = false,
  isOrganiser = false,
}: {
  activityId: string
  readOnly?: boolean
  isOrganiser?: boolean
}) {
  const [body, setBody] = useState('')
  const { data: queries = [], isLoading, isError, error } = useMyQueries(activityId)
  const submitMut = useSubmitQuery()
  const { addToast } = useToast()
  
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new queries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [queries.length])

  const trimmed = body.trim()
  const canSubmit = trimmed.length >= BODY_MIN && trimmed.length <= BODY_MAX

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!canSubmit) return

    submitMut.mutate(
      { id: activityId, body: trimmed },
      {
        onSuccess: () => {
          setBody('')
          addToast('Question sent to the organisers', 'success')
        },
        onError: (err) => {
          addToast((err as Error).message, 'error')
        },
      },
    )
  }

  return (
    <Card className={cx("flex flex-col overflow-hidden mt-8", (isOrganiser && queries.length === 0) ? "h-auto" : "h-[600px]")}>
      {/* Header */}
      <div className="p-5 border-b border-white/5 shrink-0 bg-white/[0.02]">
        <h3 className="text-[15px] font-semibold text-offwhite flex items-center justify-between">
          <span>{readOnly ? 'Your questions' : 'Ask the organising team'}</span>
          {readOnly && (
            <Badge tone="neutral">Questions closed</Badge>
          )}
        </h3>
      </div>

      {isLoading ? (
        <div className="p-10 text-center text-caption text-graytext-mid">Loading your questions...</div>
      ) : isError ? (
        <div className="p-5"><ErrorState error={error} /></div>
      ) : queries.length === 0 && readOnly ? (
        <div className="p-10 text-center text-[13px] text-graytext-mid m-auto">
          You did not ask the team anything at this event.
        </div>
      ) : (
        <>
          {/* Chat List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col items-center">
            <div className="w-full max-w-[600px] flex flex-col gap-6 mt-auto">
              
              {queries.length === 0 && !readOnly && (
                 <div className="text-center text-[13px] text-graytext-mid pb-4 flex flex-col items-center gap-4">
                   {isOrganiser && (
                     <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
                       <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                       <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                     </svg>
                   )}
                   {isOrganiser ? "No questions have been asked by attendees yet." : "No questions asked yet. Have a question about logistics or food? Ask the organizing team here."}
                 </div>
              )}

              {/* Sort oldest first for chronological chat flow */}
              {[...queries].reverse().map((q) => (
                <div key={q.id} className="flex flex-col gap-3">
                  
                  {/* Student Question Bubble (Right Side) */}
                  <div className="flex flex-col items-end pl-12">
                    <div className="flex items-center gap-2 mb-1 pr-1">
                      <span className="text-[11px] font-medium text-graytext-mid uppercase tracking-wider">
                        You · {new Date(q.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={cx(
                      "rounded-2xl rounded-tr-sm px-4 py-2.5 text-[14px] max-w-[90%] shadow-sm",
                      q.status === 'open' ? "bg-white/10 text-offwhite" : "bg-teal/20 text-teal-50 border border-teal/20"
                    )}>
                      {q.body}
                    </div>
                    {q.status === 'open' && (
                      <span className="text-[10px] text-graytext-mid pr-1 mt-1 font-medium">Delivered</span>
                    )}
                  </div>

                  {/* Organiser Answer Bubble (Left Side) */}
                  {q.status === 'answered' && (
                    <div className="flex flex-col items-start pr-12">
                      <div className="flex items-center gap-2 mb-1 pl-1">
                        <span className="text-[11px] font-medium text-teal/80 uppercase tracking-wider">
                          Organising Team · {q.responded_at && new Date(q.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="bg-white/10 text-offwhite rounded-2xl rounded-tl-sm px-4 py-2.5 text-[14px] max-w-[90%] shadow-sm">
                        {q.response_body}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>

          {/* Sticky Input Footer */}
          {!readOnly && (
            <div className="p-4 border-t border-white/5 bg-black/40 shrink-0 flex justify-center">
              <div className="w-full max-w-[600px]">
                {isOrganiser ? (
                  <div className="bg-white/5 border border-teal/20 rounded-2xl p-3 text-center">
                    <p className="text-[12px] text-teal/80">You are an organiser for this event. Switch to the Organiser dashboard to answer attendee questions.</p>
                  </div>
                ) : (
                  <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-2xl p-3 shadow-inner focus-within:ring-1 focus-within:ring-teal/50 focus-within:border-teal/50 transition-all">
                  <Textarea
                    value={body}
                    onChange={(ev) => setBody(ev.target.value)}
                    maxLength={BODY_MAX}
                    rows={2}
                    placeholder="Type your question..."
                    className="bg-transparent border-none p-1 focus:ring-0 resize-none text-[14px] text-offwhite placeholder:text-graytext-mid"
                  />
                  <div className="flex justify-between items-center mt-2 pt-2">
                    <span className="text-[11px] text-graytext-mid pl-1">
                      {trimmed.length < BODY_MIN
                        ? `At least ${BODY_MIN} characters`
                        : `${BODY_MAX - trimmed.length} chars left`}
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      className="py-1.5 px-5 h-auto text-[12px] bg-teal hover:bg-teal-400 text-onyx font-bold rounded-full"
                      disabled={!canSubmit || submitMut.isPending}
                    >
                      {submitMut.isPending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}







