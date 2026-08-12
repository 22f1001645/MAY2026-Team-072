import { useState } from 'react'
import { CITIES } from '../lib/mock'
import { useLeaderboard, useMyPoints } from '../lib/queries'
import { useSession } from '../lib/session'
import { Badge, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import type { LeaderRow, LedgerEntry } from '../lib/types'
import { cx } from '../lib/format'

// Gamification Tiers
function getTierInfo(points: number) {
  if (points >= 600) return { name: 'Diamond', icon: '💎', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', next: null }
  if (points >= 300) return { name: 'Gold', icon: '🥇', color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/30', next: { name: 'Diamond', points: 600 } }
  if (points >= 100) return { name: 'Silver', icon: '🥈', color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/30', next: { name: 'Gold', points: 300 } }
  return { name: 'Bronze', icon: '🥉', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', next: { name: 'Silver', points: 100 } }
}

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
  
  // Calculate milestone to next rank
  let nextRankTarget: LeaderRow | null = null
  if (me && me.rank > 1) {
    nextRankTarget = ranked.find((r: LeaderRow) => r.rank === me.rank - 1) ?? null
  }

  return (
    <div className="pb-12">
      <SectionTitle
        eyebrow="Recognition"
        title="Leaderboard"
        sub="Every contribution leaves a durable, creditable trace. Attend, organise, volunteer — it all counts."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main Column */}
        <div>
          {/* Scope Filters */}
          <div className="mb-8 flex flex-wrap gap-2">
            {['Overall', ...CITIES.map((c) => c.name)].map((c) => (
              <button
                key={c}
                onClick={() => setScope(c)}
                className={cx(
                  'rounded-full border px-5 py-2 text-[13px] font-semibold transition-all duration-300 uppercase tracking-widest',
                  scope === c
                    ? 'border-teal/50 bg-teal/20 text-teal shadow-[0_0_15px_rgba(63,212,182,0.15)]'
                    : 'border-white/5 bg-transparent text-graytext-mid hover:text-offwhite hover:border-white/10 hover:bg-white/5',
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
                <div className="mb-10 flex justify-center items-end gap-3 sm:gap-6 mt-12 px-4">
                  {[ranked[1], ranked[0], ranked[2]].map((r: LeaderRow | undefined, i: number) => {
                    if (!r) return null;
                    const order = [1, 0, 2][i]
                    
                    const heights = ['h-28', 'h-40', 'h-24']
                    const crowns = ['🥈', '👑', '🥉']
                    const colors = [
                      'from-slate-300/30 to-slate-300/5 border-slate-300/40 text-slate-300 shadow-[0_0_30px_rgba(203,213,225,0.15)]', // 2nd
                      'from-gold/40 to-gold/5 border-gold/50 text-gold shadow-[0_0_40px_rgba(255,215,0,0.25)]', // 1st
                      'from-amber-600/30 to-amber-600/5 border-amber-600/40 text-amber-500 shadow-[0_0_30px_rgba(217,119,6,0.15)]' // 3rd
                    ]
                    
                    return (
                      <div key={r.name} className="text-center flex-1 max-w-[140px] relative animate-fade-up" style={{ animationDelay: `${order * 150}ms` }}>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl filter drop-shadow-lg z-10 animate-bounce-slow">
                          {crowns[i]}
                        </div>
                        
                        <div className="mb-3 relative z-10 px-2">
                          <div className="truncate text-[14px] font-bold text-offwhite">{r.name}</div>
                          <div className={cx("text-[13px] font-black", order === 0 ? "text-gold" : order === 1 ? "text-slate-300" : "text-amber-500")}>
                            {r.points} pts
                          </div>
                        </div>
                        
                        <div
                          className={cx(
                            'rounded-t-2xl border-x border-t bg-gradient-to-b backdrop-blur-sm relative overflow-hidden transition-all duration-500',
                            heights[i],
                            colors[i]
                          )}
                        >
                          {/* Inner glow line */}
                          <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40" />
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[40px] font-black opacity-20">
                            {order + 1}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Table */}
              <div className="rounded-3xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl backdrop-blur-xl animate-fade-up">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[11px] uppercase tracking-widest text-graytext-mid">
                        <th className="px-6 py-4 text-left font-semibold">Rank</th>
                        <th className="px-6 py-4 text-left font-semibold">Student</th>
                        <th className="px-6 py-4 text-right font-semibold">Stats</th>
                        <th className="px-6 py-4 text-right font-semibold">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {ranked.map((r: LeaderRow) => {
                        const tier = getTierInfo(r.points)
                        return (
                          <tr
                            key={r.name}
                            className={cx(
                              'group transition-colors duration-200',
                              r.isMe ? 'bg-teal/10 hover:bg-teal/15' : 'hover:bg-white/5',
                            )}
                          >
                            <td className="px-6 py-4">
                              <span
                                className={cx(
                                  'grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold shadow-sm',
                                  r.rank === 1 ? 'bg-gold/20 text-gold ring-1 ring-gold/30' : 
                                  r.rank === 2 ? 'bg-slate-300/20 text-slate-300 ring-1 ring-slate-300/30' :
                                  r.rank === 3 ? 'bg-amber-600/20 text-amber-500 ring-1 ring-amber-600/30' : 
                                  'bg-white/5 text-graytext-light group-hover:bg-white/10 group-hover:text-offwhite transition-colors',
                                )}
                              >
                                {r.rank}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={cx("font-bold", r.isMe ? "text-teal" : "text-offwhite")}>{r.name}</span>
                                    {r.isMe && (
                                      <span className="px-2 py-0.5 rounded-full bg-teal text-onyx text-[10px] font-bold uppercase tracking-wider">You</span>
                                    )}
                                  </div>
                                  <div className="text-[12px] text-graytext-mid mt-0.5">{r.city}</div>
                                </div>
                                <div className={cx("hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold", tier.bg, tier.border, tier.color)}>
                                  <span>{tier.icon}</span>
                                  <span>{tier.name}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="text-[12px] text-graytext-light">
                                <span className="font-semibold text-offwhite">{r.attended}</span> attended
                              </div>
                              <div className="text-[12px] text-graytext-light mt-0.5">
                                <span className="font-semibold text-offwhite">{r.organised}</span> org
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={cx(
                                "text-[16px] font-black", 
                                r.rank === 1 ? "text-gold" : r.rank === 2 ? "text-slate-300" : r.rank === 3 ? "text-amber-500" : "text-teal"
                              )}>
                                {r.points}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                      {ranked.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                            <div className="text-graytext-mid mb-1">No points recorded {scope !== 'Overall' ? `in ${scope}` : 'yet'}.</div>
                            <div className="text-[13px] text-graytext-light">Attend events or refer friends to get on the board!</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Gamification Sidebar */}
        <div className="space-y-6">
          
          {/* Milestone Card */}
          <Card className={cx("relative overflow-hidden p-6 border", myTier.border)}>
            <div className={cx("absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full pointer-events-none -translate-y-16 translate-x-16", myTier.bg)} />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-graytext-light mb-1">Your Status</div>
                  <div className={cx("text-h3 font-bold flex items-center gap-2", myTier.color)}>
                    <span>{myTier.icon}</span> {myTier.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-widest text-graytext-light mb-1">Lifetime Pts</div>
                  <div className="text-2xl font-black text-offwhite leading-none">{totalPoints}</div>
                </div>
              </div>

              {/* Progress Bar to next tier */}
              {myTier.next && (
                <div className="mt-6">
                  <div className="flex justify-between text-[12px] mb-2">
                    <span className="text-graytext-light">Progress to <strong className={cx("font-bold", getTierInfo(myTier.next.points).color)}>{myTier.next.name}</strong></span>
                    <span className="font-semibold text-offwhite">{totalPoints} / {myTier.next.points}</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden ring-1 ring-white/10 ring-inset">
                    <div 
                      className={cx("h-full rounded-full transition-all duration-1000 relative", getTierInfo(myTier.next.points).bg.replace('/10', ''))} 
                      style={{ width: `${Math.min(100, (totalPoints / myTier.next.points) * 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20" />
                    </div>
                  </div>
                </div>
              )}

              {/* Rank Overtake Callout */}
              {nextRankTarget && (
                <div className="mt-5 p-3 rounded-xl bg-black/40 border border-white/5 text-[13px] text-graytext-light flex items-start gap-3">
                  <div className="mt-0.5">🎯</div>
                  <div>
                    You are <strong className="text-offwhite">{nextRankTarget.points - totalPoints + 1} points</strong> away from overtaking <strong className="text-offwhite">{nextRankTarget.name}</strong> for Rank #{nextRankTarget.rank}!
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Ledger */}
          <Card className="p-6 border-white/5">
            <h3 className="mb-4 text-[15px] font-bold text-offwhite">Contribution Ledger</h3>
            {points?.entries?.length ? (
              <div className="space-y-4">
                {points.entries.map((l: LedgerEntry) => (
                  <div key={l.id} className="flex items-center justify-between gap-4 group">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-[14px] group-hover:bg-teal/10 transition-colors">
                      {l.action === 'attended' ? '🎟️' : l.action === 'organised' ? '🎤' : '🎁'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-offwhite group-hover:text-teal transition-colors">
                        {l.activity ?? 'Contribution'}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider text-graytext-mid mt-0.5">{l.action}</div>
                    </div>
                    <span className="shrink-0 font-black text-teal text-[15px]">+{l.points}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl mb-2 opacity-50">🌱</div>
                <p className="text-[13px] text-graytext-mid">
                  No points yet. Earn them by attending or organising events!
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

