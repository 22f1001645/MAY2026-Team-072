import { Badge, Button, Progress, useToast } from './ui'
import { useCastVote, useClosePoll } from '../lib/queries'
import { cx } from '../lib/format'
import type { EventPoll } from '../lib/types'

/**
 * CHAT-01 — one poll on an event channel.
 *
 * Two faces, never both: the ballot (an unvoted, open poll) or the result bars
 * (once the caller has voted, or once the poll is closed). The switch is on
 * `my_vote`, which `channel_service.list_polls` computes per caller, so a
 * refetch after voting flips the card on its own — no local "has voted" state
 * to drift out of sync with the server.
 */
export default function PollCard({
  poll,
  activityId,
  canManage,
  channelClosed = false,
}: {
  poll: EventPoll
  activityId: string
  canManage: boolean
  /** The event itself is over: show the result, never a ballot the vote route
   *  will refuse. The badge still reports the poll's own status, and the team
   *  can still close it — `close_poll` is ungated after the event (D-17). */
  channelClosed?: boolean
}) {
  const castVoteMut = useCastVote()
  const closePollMut = useClosePoll()
  const { addToast } = useToast()

  const closed = poll.status === 'closed'
  // `?? []` because only the LIST endpoint carries counts — the create/close
  // responses are typed `Omit<EventPoll, 'vote_counts' | 'my_vote'>` (08-03),
  // and a card rendered off one of those would otherwise throw on `.reduce`.
  const counts = poll.vote_counts ?? []
  const total = counts.reduce((sum, n) => sum + n, 0)
  // Same hazard, same defence: `my_vote` is absent on those responses too, and
  // `undefined !== null` is true — which flipped the card to an all-zero result
  // view with no way to vote, for exactly the case the line above guards.
  const myVote = poll.my_vote ?? null
  const showResults = myVote !== null || closed || channelClosed || canManage

  return (
    <div className="group rounded-2xl bg-white/[0.02] p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-white/[0.04] hover:shadow-[0_8px_30px_rgba(92,230,201,0.12)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h4 className="text-[14px] font-semibold leading-snug text-offwhite">{poll.question}</h4>
        <Badge tone={closed ? 'neutral' : 'teal'} className="shrink-0">
          {closed ? 'Closed' : 'Open'}
        </Badge>
      </div>

      {showResults ? (
        <div className="space-y-2.5">
          {poll.options.map((option, i) => {
            const count = counts[i] ?? 0
            const pct = total === 0 ? 0 : Math.round((count / total) * 100)
            const mine = myVote === i
            return (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                  <span className={cx('flex items-center gap-1.5', mine ? 'text-teal' : 'text-graytext-light')}>
                    {mine && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Your vote">
                        <path d="m5 12 4 4L19 6" />
                      </svg>
                    )}
                    {option}
                  </span>
                  <span className="shrink-0 text-graytext-mid">
                    {count} · {pct}%
                  </span>
                </div>
                <Progress value={count} max={Math.max(1, total)} tone={mine ? 'teal' : 'gold'} />
              </div>
            )
          })}
          <p className="pt-1 text-caption text-graytext-mid">
            {total} {total === 1 ? 'vote' : 'votes'}
            {myVote === null && closed && ' · you did not vote'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {poll.options.map((option, i) => (
            <button
              key={i}
              type="button"
              disabled={castVoteMut.isPending}
              onClick={() =>
                castVoteMut.mutate(
                  { id: activityId, pollId: poll.id, option_index: i },
                  {
                    onSuccess: () => addToast('Vote recorded'),
                    onError: (err) => addToast((err as Error).message, 'error'),
                  },
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-left text-[13px] text-offwhite transition-colors hover:border-teal/50 hover:bg-teal/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {canManage && !closed && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={closePollMut.isPending}
            onClick={() =>
              closePollMut.mutate(
                { id: activityId, pollId: poll.id },
                {
                  onSuccess: () => addToast('Poll closed'),
                  onError: (err) => addToast((err as Error).message, 'error'),
                },
              )
            }
          >
            {closePollMut.isPending ? 'Closing…' : 'Close poll'}
          </Button>
        </div>
      )}
    </div>
  )
}
