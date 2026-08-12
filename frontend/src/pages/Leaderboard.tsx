import { useState } from 'react'
import { CITIES } from '../lib/mock'
import { useLeaderboard, useMyPoints } from '../lib/queries'
import { useSession } from '../lib/session'
import { Badge, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import type { LeaderRow, LedgerEntry } from '../lib/types'
import { cx } from '../lib/format'

// Gamification tiers — a computed lens over the same points total, no separate store.
function getTierInfo(points: number) {
  if (points >= 600) return { name: 'Diamond', icon: '💎', tone: 'teal' as const, next: null as { name: string; points: number } | null }
  if (points >= 300) return { name: 'Gold', icon: '🥇', tone: 'gold' as const, next: { name: 'Diamond', points: 600 } }
  if (points >= 100) return { name: 'Silver', icon: '🥈', tone: 'neutral' as const, next: { name: 'Gold', points: 300 } }
  return { name: 'Bronze', icon: '🥉', tone: 'neutral' as const, next: { name: 'Silver', points: 100 } }
}

// Recognition — points + leaderboard, computed over attendance data (FR-G5)
export default function Leaderboard() {
  const { name } = useSession()
  const [scope, setScope] = useState('Overall')
  const { data: rows = [], isLoading, isError, error } = useLeaderboard(
    scope === 'Overall' ? undefined : scope,
  )
  const { data: points } = useMyPoints()

  const ranked = rows.map((r: LeaderRow) => ({ ...r, isMe: r.name === name }))
  const me = ranked.find((r: LeaderRow) => r.isMe)
  const totalPoints = points?.total ?? 0
  const myTier = getTierInfo(totalPoints)

  return (
    <div>
      <SectionTitle
        eyebrow="Recognition"
        title="Leaderboard"
        sub="Every contribution leaves a durable, creditable trace. Attend, organise, volunteer — it all counts."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Leaderboard */}
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {['Overall', ...CITIES.map((c) => c.name)].map((c) => (
              <button
                key={c}
                onClick={() => setScope(c)}
                className={cx(
                  'rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ease-material',
                  scope === c
                    ? 'border-teal bg-teal text-onyx'
                    : 'border-white/10 bg-white/5 text-graytext-light hover:text-offwhite',
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {isLoading && <Loading label="Tallying points…" />}
          {isError && <ErrorState error={error} />}

          {!isLoading && !isError && (
            <>
              {/* Podium */}
              {ranked.length > 0 && (
                <div className="mb-6 flex justify-center items-end gap-4">
                  {[ranked[1], ranked[0], ranked[2]].map((r: LeaderRow | undefined, i: number) => {
                    if (!r) return null;
                    const heights = ['h-24', 'h-32', 'h-20']
                    const medals = ['🥈', '🥇', '🥉']
                    const order = [1, 0, 2][i]
                    return (
                      <div key={r.name} className="text-center flex-1 max-w-[120px]">
                        <div className="mb-2 text-2xl">{medals[i]}</div>
                        <div className="truncate text-[13px] font-semibold text-offwhite">
                          {r.name}
                        </div>
                        <div className="text-caption text-teal">{r.points} pts</div>
                        <div
                          className={cx(
                            'mt-2 rounded-t-xl border-x border-t',
                            heights[i],
                            order === 0
                              ? 'border-gold/40 bg-gradient-to-b from-gold/25 to-transparent'
                              : 'border-teal/30 bg-gradient-to-b from-teal/15 to-transparent',
                          )}
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              <Card className="overflow-hidden">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-right">Attended</th>
                      <th className="px-4 py-3 text-right">Organised</th>
                      <th className="px-4 py-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((r: LeaderRow) => (
                      <tr
                        key={r.name}
                        className={cx(
                          'border-b border-white/5 last:border-0',
                          r.isMe && 'bg-teal/[0.07]',
                        )}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={cx(
                              'grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold',
                              r.rank <= 3 ? 'bg-gold/20 text-gold' : 'bg-white/5 text-graytext-light',
                            )}
                          >
                            {r.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-offwhite">{r.name}</span>
                          {r.isMe && (
                            <Badge tone="teal">
                              <span className="ml-1">You</span>
                            </Badge>
                          )}
                          <div className="text-caption text-graytext-mid">{r.city}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-graytext-light">{r.attended}</td>
                        <td className="px-4 py-3 text-right text-graytext-light">{r.organised}</td>
                        <td className="px-4 py-3 text-right font-bold text-teal">{r.points}</td>
                      </tr>
                    ))}
                    {ranked.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-graytext-mid">
                          No points recorded {scope !== 'Overall' ? `in ${scope}` : 'yet'}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>

        {/* My points ledger (FR-G4) */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-b from-teal/10 to-transparent p-6 text-center">
            <div className="text-caption uppercase tracking-wider text-graytext-light">
              My points
            </div>
            <div className="my-1 text-[44px] font-bold leading-none text-teal">{totalPoints}</div>
            <div className="text-caption text-graytext-light">
              {me
                ? `Rank #${me.rank} ${scope === 'Overall' ? 'Overall' : `in ${scope}`}`
                : `No rank in ${scope} yet`}
            </div>
            <div className="mt-3 flex flex-col items-center gap-1">
              <Badge tone={myTier.tone}>
                {myTier.icon} {myTier.name} tier
              </Badge>
              {myTier.next && (
                <span className="text-caption text-graytext-mid">
                  {myTier.next.points - totalPoints} pts to {myTier.next.name}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-h3 font-semibold text-gold">Contribution ledger</h3>
            {points?.entries?.length ? (
              <div className="space-y-3">
                {points.entries.map((l: LedgerEntry) => (
                  <div key={l.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] text-offwhite">
                        {l.activity ?? 'Contribution'}
                      </div>
                      <div className="text-caption capitalize text-graytext-mid">{l.action}</div>
                    </div>
                    <span className="shrink-0 font-bold text-teal">+{l.points}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption text-graytext-mid">
                No points yet — they land here when you're checked in at an event.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
