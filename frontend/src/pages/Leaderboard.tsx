import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Gem, Star, Zap, Medal, Crown, Ticket, Mic, Gift, Target, Sprout } from 'lucide-react'

import { useLeaderboard, useMyPoints, useCities } from '../lib/queries'
import { useSession } from '../lib/session'
import { Badge, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import type { LeaderRow, LedgerEntry } from '../lib/types'
import { cx } from '../lib/format'

function InlineDropdown({ value, options, onChange }: { value: string, options: string[], onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 border-b-[3px] border-teal/40 text-teal hover:border-teal transition-colors focus:outline-none cursor-pointer pb-0.5"
      >
        <span>{value === 'Overall' ? 'overall' : value}</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-3 w-56 max-h-64 rounded-xl border border-white/10 bg-black/90 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-y-auto custom-scrollbar animate-fade-down origin-top-left flex flex-col p-1.5 text-[15px] font-semibold text-white tracking-normal leading-normal text-left shadow-2xl">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              className={`text-left px-4 py-2.5 rounded-lg transition-colors ${value === opt ? 'bg-teal/20 text-teal' : 'hover:bg-white/10'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Gamification tiers — a computed lens over the same points total, no separate store.
function getTierInfo(points: number) {
  if (points >= 600) return { name: 'Diamond', icon: <Gem size={14} />, tone: 'teal' as const, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30', next: null as { name: string; points: number } | null }
  if (points >= 300) return { name: 'Platinum', icon: <Star size={14} />, tone: 'neutral' as const, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', next: { name: 'Diamond', points: 600 } }
  if (points >= 100) return { name: 'Elite', icon: <Zap size={14} />, tone: 'neutral' as const, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', next: { name: 'Platinum', points: 300 } }
  return { name: 'Starter', icon: <Sprout size={14} />, tone: 'neutral' as const, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30', next: { name: 'Elite', points: 100 } }
}

// Recognition — points + leaderboard, computed over attendance data (FR-G5)
export default function Leaderboard() {
  const { name, id: sessionId } = useSession()
  const [scope, setScope] = useState('Overall')
  const { data: rows = [], isLoading, isError, error } = useLeaderboard(
    scope === 'Overall' ? undefined : scope,
  )
  const { data: points } = useMyPoints()
  const { data: CITIES = [] } = useCities()

  const ranked = rows
    .filter((r: LeaderRow) => r.points > 0)
    .map((r: LeaderRow) => ({ ...r, isMe: r.userId === sessionId }))
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
      {/* Personalized Hero Banner */}
      {me ? (
        <div className="mb-10 relative overflow-hidden rounded-3xl border border-teal/20 bg-gradient-to-br from-teal/10 via-black/40 to-black p-8 shadow-[0_0_40px_rgba(63,212,182,0.1)] backdrop-blur-xl animate-fade-in">
          <div className="absolute -top-10 -right-10 p-12 opacity-10 pointer-events-none text-teal">
            <Crown size={200} strokeWidth={1} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-teal font-semibold tracking-widest uppercase text-[12px] mb-2 flex items-center gap-2">
                <Crown size={14} /> Global Leaderboard
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-offwhite mb-3">
                {me.rank === 1 ? "You're #1! Keep it up!" : `You are Rank #${me.rank}!`}
              </h1>
              <p className="text-graytext-mid max-w-md text-[14px]">
                You are in the Top {Math.max(1, Math.round((me.rank / ranked.length) * 100))}% of students {scope !== 'Overall' ? `in ${scope}` : 'overall'}. Every contribution leaves a durable, creditable trace.
              </p>
            </div>
            {nextRankTarget && (
              <div className="bg-black/50 border border-white/10 rounded-2xl p-5 min-w-[220px] backdrop-blur-md">
                <div className="text-[11px] uppercase tracking-widest text-graytext-mid font-semibold mb-2">Target to Beat</div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[12px] font-bold text-slate-300">
                    {nextRankTarget.rank}
                  </div>
                  <div>
                    <div className="text-offwhite font-bold text-[14px] leading-tight">{nextRankTarget.name}</div>
                    <div className="text-gold text-[13px] font-black">{nextRankTarget.points} pts</div>
                  </div>
                </div>
                <div className="text-[13px] text-teal font-semibold mt-3 pt-3 border-t border-white/5">
                  Only {nextRankTarget.points - me.points + 1} points away!
                </div>
              </div>
            )}
            {!nextRankTarget && me.rank === 1 && (
              <div className="bg-gold/10 border border-gold/30 rounded-2xl p-5 min-w-[220px] backdrop-blur-md">
                 <div className="text-[11px] uppercase tracking-widest text-gold/70 font-semibold mb-1">Current Status</div>
                 <div className="text-gold font-bold text-lg">Undisputed Champion</div>
              </div>
            )}
          </div>
        </div>
      ) : sessionId ? (
        <div className="mb-10 relative overflow-hidden rounded-3xl border border-teal/20 bg-gradient-to-br from-teal/10 via-black/40 to-black p-8 shadow-[0_0_40px_rgba(63,212,182,0.1)] backdrop-blur-xl animate-fade-in">
          <div className="absolute -top-10 -right-10 p-12 opacity-10 pointer-events-none text-teal">
            <Crown size={200} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="text-teal font-semibold tracking-widest uppercase text-[12px] mb-2 flex items-center gap-2">
              <Crown size={14} /> Global Leaderboard
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-offwhite mb-3">
              You haven't ranked {scope !== 'Overall' ? `in ${scope}` : 'overall'} yet!
            </h1>
            <p className="text-graytext-mid max-w-md text-[14px]">
              Attend, organise, or volunteer at events {scope !== 'Overall' ? `in ${scope}` : ''} to get your name on the board. Every contribution leaves a durable, creditable trace.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-10">
          <SectionTitle
            eyebrow="Recognition"
            title="Leaderboard"
            sub="Every contribution leaves a durable, creditable trace. Attend, organise, volunteer — it all counts."
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main Column */}
        <div className="min-w-0">
          {/* Scope Filters */}
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex flex-wrap items-center justify-center lg:justify-start gap-3">
              Showing top students in
              <InlineDropdown 
                value={scope} 
                options={['Overall', ...new Set(CITIES.map((c: any) => c.name))]} 
                onChange={setScope} 
              />
            </h2>
          </div>

          {isLoading && <Loading label="Tallying points…" />}
          {isError && <ErrorState error={error} />}

          {!isLoading && !isError && (
            <>
              {/* Highlight Cards for Top 3 */}
              {ranked.length > 0 && (
                <div className="mb-12 flex justify-center items-stretch gap-4 px-4 pt-4">
                  {[ranked[1], ranked[0], ranked[2]].map((r: LeaderRow | undefined, i: number) => {
                    if (!r) return null;
                    const order = [1, 0, 2][i]
                    
                    const isFirst = order === 0
                    const crowns = [
                      <Medal className="w-8 h-8 text-slate-300" strokeWidth={1.5} />, 
                      <Crown className="w-10 h-10 text-gold" strokeWidth={1.5} />, 
                      <Medal className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
                    ]
                    const cardStyles = [
                      'border-white/10 bg-white/5 hover:bg-white/10 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(203,213,225,0.2)] text-slate-300 cursor-default', // 2nd
                      'border-gold/30 bg-gradient-to-b from-gold/10 to-gold/5 shadow-[0_0_40px_rgba(255,215,0,0.15)] scale-110 z-10 text-gold hover:-translate-y-2 hover:shadow-[0_20px_50px_-12px_rgba(255,215,0,0.4)] cursor-default', // 1st
                      'border-white/10 bg-white/5 hover:bg-white/10 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.25)] text-amber-500 cursor-default' // 3rd
                    ]
                    const rankText = ['2nd', '1st', '3rd']
                    
                    return (
                      <div 
                        key={r.name} 
                        className={cx(
                          "flex-1 max-w-[180px] p-5 rounded-2xl border backdrop-blur-md flex flex-col items-center relative overflow-hidden transition-all duration-500 animate-fade-up",
                          cardStyles[i]
                        )} 
                        style={{ animationDelay: `${order * 150}ms` }}
                      >
                        {/* Inner glow line for 1st place */}
                        {isFirst && <div className="absolute top-0 left-0 right-0 h-[1px] bg-gold/40" />}
                        
                        <div className="mb-4">
                          {crowns[i]}
                        </div>
                        
                        <div className="text-center relative z-10 w-full">
                          <div className={cx("text-[11px] uppercase tracking-widest font-semibold mb-1", isFirst ? "text-gold/70" : "text-graytext-mid")}>
                            {rankText[i]} Place
                          </div>
                          <div className="truncate text-[15px] font-bold text-offwhite mb-1">{r.name}</div>
                          <div className="text-[14px] font-black">
                            {r.points} pts
                          </div>
                        </div>
                        
                        {/* Subtle watermark */}
                        <div className="absolute -bottom-4 -right-4 text-[80px] font-black opacity-[0.03] select-none pointer-events-none">
                          {order + 1}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Table or Empty State */}
              {ranked.length > 0 ? (
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
                                  <span className="font-semibold text-offwhite">{r.attended}</span> Attended
                                </div>
                                {(r.organised > 0 || r.isOrganiser) && (
                                  <div className="text-[12px] text-graytext-light mt-0.5">
                                    <span className="font-semibold text-offwhite">{r.organised}</span> Organised
                                  </div>
                                )}
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
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-onyx via-black to-onyx p-12 text-center shadow-2xl animate-fade-up group">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-gold/20 transition-colors duration-700" />
                  <div className="grain absolute inset-0 mix-blend-overlay opacity-20 pointer-events-none" />
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 mb-6 rounded-full bg-black/50 border border-white/5 backdrop-blur-xl flex items-center justify-center shadow-inner relative overflow-hidden">
                      <div className="absolute inset-0 bg-gold/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-out" />
                      <Crown size={36} strokeWidth={1.5} className="text-gold relative z-10" />
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3 drop-shadow-xl">
                      {scope !== 'Overall' ? `${scope} is wide open.` : 'The leaderboard is wide open.'}
                    </h2>
                    <p className="text-base text-graytext-mid max-w-md mx-auto mb-8 leading-relaxed">
                      Nobody has scored any points here yet. This is your chance to be the very first to claim the #1 spot.
                    </p>
                    
                    <Link to={scope !== 'Overall' ? `/discover?city=${encodeURIComponent(scope)}` : '/discover'}>
                      <button 
                        className="px-8 py-3.5 rounded-xl bg-white/5 text-offwhite font-bold text-[13px] tracking-wider uppercase border border-white/10 hover:bg-gold hover:text-onyx hover:border-gold hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all flex items-center gap-2"
                      >
                        <Target size={18} />
                        Conquer {scope !== 'Overall' ? scope : 'the board'}
                      </button>
                    </Link>
                  </div>
                </div>
              )}
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
                  <div className="mt-1 text-caption text-graytext-mid">
                    {me
                      ? `Rank #${me.rank} ${scope === 'Overall' ? 'Overall' : `in ${scope}`}`
                      : `No rank in ${scope} yet`}
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
                  <div className="mt-0.5 text-rose-500"><Target size={16} /></div>
                  <div>
                    You are <strong className="text-offwhite">{nextRankTarget.points - totalPoints + 1} points</strong> away from overtaking <strong className="text-offwhite">{nextRankTarget.name}</strong> for Rank #{nextRankTarget.rank}!
                  </div>
                </div>
              )}
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

          {/* Ledger */}
          <Card className="p-6 border-white/5">
            <h3 className="mb-4 text-[15px] font-bold text-offwhite">Contribution Ledger</h3>
            {points?.entries?.length ? (
              <div className="space-y-4">
                {points.entries.map((l: LedgerEntry) => (
                  <div key={l.id} className="flex items-center justify-between gap-4 group">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-[14px] group-hover:bg-teal/10 transition-colors">
                      {l.action === 'attended' ? <Ticket size={14} className="text-graytext-mid group-hover:text-teal transition-colors" /> : l.action === 'organised' ? <Mic size={14} className="text-graytext-mid group-hover:text-teal transition-colors" /> : <Gift size={14} className="text-graytext-mid group-hover:text-teal transition-colors" />}
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
                <div className="flex justify-center mb-3 opacity-50 text-teal"><Sprout size={32} /></div>
                <p className="text-[13px] text-graytext-mid">
                  No points yet. Earn them by attending or organising events!
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Tier Guide Banner */}
      <div className="mt-16 pt-12 border-t border-white/5 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-offwhite mb-2">How Tiers Work</h2>
          <p className="text-graytext-mid text-[14px]">
            Earn points by attending or organising events to climb the ranks and unlock higher tiers.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Diamond', points: '600+ pts', icon: <Gem size={24} />, bg: 'bg-cyan-400/10', color: 'text-cyan-400', border: 'border-cyan-400/30' },
            { name: 'Platinum', points: '300+ pts', icon: <Star size={24} />, bg: 'bg-purple-400/10', color: 'text-purple-400', border: 'border-purple-400/30' },
            { name: 'Elite', points: '100+ pts', icon: <Zap size={24} />, bg: 'bg-emerald-400/10', color: 'text-emerald-400', border: 'border-emerald-400/30' },
            { name: 'Starter', points: '0+ pts', icon: <Sprout size={24} />, bg: 'bg-slate-400/10', color: 'text-slate-400', border: 'border-slate-400/30' },
          ].map(tier => (
            <div key={tier.name} className={cx("p-6 rounded-2xl border backdrop-blur-sm flex flex-col items-center text-center transition-transform hover:-translate-y-1 cursor-default", tier.bg, tier.border)}>
              <div className={cx("mb-3 p-3 rounded-xl bg-black/20 shadow-inner", tier.color)}>
                {tier.icon}
              </div>
              <div className={cx("font-bold text-[16px] mb-1", tier.color)}>{tier.name}</div>
              <div className="text-[13px] font-semibold text-offwhite">{tier.points}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

