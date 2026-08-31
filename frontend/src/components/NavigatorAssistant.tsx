import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAssistant, useBroadcast, useEvent } from '../lib/queries'
import { useAuth } from '../lib/auth'
import { cx } from '../lib/format'

/* ---------------------------------------------------------------------------
 * One assistant, two jobs.
 *
 * Anywhere in the app it answers navigation: Ekatva OS has around two dozen
 * surfaces across three roles, and the name of the page you need is rarely the
 * word in your head — a student hunting for "my ticket" wants My Registrations.
 * Suggested links come from a route catalogue the server has already filtered by
 * role, so a suggestion is always a page this user can open.
 *
 * Standing on an event you run, it switches to copilot mode for THAT event and
 * answers from its records: budget remaining, who still has open tasks, what the
 * cap means for this proposal. The event id comes from the URL, and the server
 * re-checks that this person may manage it before reading anything.
 *
 * It never sends. Asked to remind the team, it drafts and hands the words back
 * with a Send button — a model broadcasting to every registered student on its
 * own reading of one sentence has no undo.
 * ------------------------------------------------------------------------- */

type Turn = {
  question: string
  answer?: string
  links?: { label: string; path: string; does: string }[]
  source?: string
  mode?: string
  draft?: string | null
  error?: string
}

/** Openers that show what kind of question each mode takes. */
const NAV_SUGGESTIONS = [
  'How do I claim my expenses?',
  'Where is my QR pass?',
  'How do I propose an event?',
]

const EVENT_SUGGESTIONS = [
  'How much budget is remaining?',
  'What is still pending?',
  "Who hasn't completed their tasks?",
  'Draft a reminder for the team',
]

/** The event id in the current path, if we are standing on an event surface. */
function useEventIdFromPath(): string | undefined {
  const { pathname } = useLocation()
  return pathname.match(/^\/events\/([^/]+)/)?.[1]
}

export default function NavigatorAssistant() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [sentIdx, setSentIdx] = useState<number | null>(null)
  const ask = useAssistant()
  const broadcast = useBroadcast()
  const navigate = useNavigate()

  // Copilot mode is for people who RUN events. A student standing on an event
  // page is a guest there, and offering them a copilot the server would refuse
  // is worse than not offering one. The server re-checks regardless; this only
  // keeps the widget from promising something it cannot deliver.
  const { capabilities } = useAuth()
  const pathEventId = useEventIdFromPath()
  const activityId = capabilities?.isOrganiser ? pathEventId : undefined
  const { data: activeEvent } = useEvent(activityId)
  const inEventMode = !!activityId
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, ask.isPending])

  // Escape closes, which is the gesture anyone tries first on a floating panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const submit = (question: string) => {
    const text = question.trim()
    if (!text || ask.isPending) return
    setQ('')
    setTurns((prev) => [...prev, { question: text }])

    ask.mutate({ question: text, activityId }, {
      onSuccess: (res) =>
        setTurns((prev) => {
          const next = [...prev]
          next[next.length - 1] = { ...next[next.length - 1], ...res }
          // Seed the editable draft so the Head can adjust before sending.
          if (res.draft) setDrafts((d) => ({ ...d, [next.length - 1]: res.draft as string }))
          return next
        }),
      onError: (err: any) => {
        // Event scope refused (someone else's event, or it vanished): fall back
        // to a navigation answer instead of leaving the question unanswered.
        if (activityId) {
          ask.mutate(
            { question: text },
            {
              onSuccess: (res) =>
                setTurns((prev) => {
                  const next = [...prev]
                  next[next.length - 1] = { ...next[next.length - 1], ...res }
                  return next
                }),
              onError: () =>
                setTurns((prev) => {
                  const next = [...prev]
                  next[next.length - 1] = {
                    ...next[next.length - 1],
                    error: err?.message || 'The assistant could not answer just now.',
                  }
                  return next
                }),
            },
          )
          return
        }
        setTurns((prev) => {
          const next = [...prev]
          next[next.length - 1] = {
            ...next[next.length - 1],
            error: err?.message || 'The assistant could not answer just now.',
          }
          return next
        })
      },
    })
  }

  /** Routes with an :id placeholder cannot be linked blind — see the note below. */
  const isTemplate = (path: string) => path.includes(':')

  const sendDraft = (i: number) => {
    const body = (drafts[i] ?? '').trim()
    if (!body || !activityId || broadcast.isPending) return
    broadcast.mutate(
      { id: activityId, title: `Update — ${activeEvent?.title ?? 'your event'}`, body },
      { onSuccess: () => setSentIdx(i) },
    )
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open the Ekatva assistant"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-onyx shadow-[0_8px_30px_rgba(92,230,201,0.35)] transition-transform hover:scale-105"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Ekatva assistant"
          className="fixed bottom-6 right-6 z-40 flex h-[520px] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-onyx/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-offwhite">Ask Ekatva</div>
              {/* Saying which event it is scoped to is the whole trust story: the
                  Head can see it is reading their event and only theirs. */}
              <div className="truncate text-[11px] text-graytext-mid">
                {inEventMode
                  ? `Copilot · ${activeEvent?.title ?? 'this event'}`
                  : 'Find your way around'}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close the assistant"
              className="rounded-lg px-2 py-1 text-graytext-mid transition-colors hover:bg-white/5 hover:text-offwhite"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-[13px] text-graytext-light">
                  {inEventMode
                    ? 'Ask about this event — budget, tasks, what is still outstanding.'
                    : 'Tell me what you are trying to do and I will point you at the right page.'}
                </p>
                <div className="space-y-1.5">
                  {(inEventMode ? EVENT_SUGGESTIONS : NAV_SUGGESTIONS).map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-[13px] text-offwhite transition-colors hover:border-teal/40 hover:bg-teal/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) => (
              <div key={i} className="space-y-2">
                <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-teal/15 px-3 py-2 text-[13px] text-offwhite">
                  {t.question}
                </div>

                {t.error ? (
                  <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
                    {t.error}
                  </div>
                ) : t.answer ? (
                  <div className="space-y-2">
                    <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-offwhite">
                      {t.answer}
                    </div>

                    {t.links?.map((l) =>
                      isTemplate(l.path) ? (
                        /* A path like /events/:id/expenses needs an event chosen
                           first, and guessing one would send people to the wrong
                           event's money. Named, not linked. */
                        <div
                          key={l.path}
                          className="w-fit max-w-[90%] rounded-xl border border-dashed border-white/15 px-3 py-2 text-[12px] text-graytext-light"
                        >
                          <span className="font-semibold text-offwhite">{l.label}</span> — open it from
                          the event you mean.
                        </div>
                      ) : (
                        <button
                          key={l.path}
                          onClick={() => { navigate(l.path); setOpen(false) }}
                          className="flex w-fit max-w-[90%] items-center gap-1.5 rounded-xl border border-teal/30 bg-teal/10 px-3 py-2 text-[12px] font-semibold text-teal transition-colors hover:bg-teal/20"
                        >
                          Go to {l.label}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      ),
                    )}

                    {/* A drafted message: editable, and inert until a person sends
                        it. The copilot has no path to the broadcast endpoint. */}
                    {t.draft != null && (
                      <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-3">
                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gold">
                          Draft — not sent
                        </div>
                        <textarea
                          value={drafts[i] ?? ''}
                          onChange={(ev) => setDrafts((d) => ({ ...d, [i]: ev.target.value }))}
                          rows={3}
                          disabled={sentIdx === i}
                          className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[13px] text-offwhite outline-none focus:border-teal disabled:opacity-60"
                        />
                        {sentIdx === i ? (
                          <p className="mt-2 text-[12px] text-teal">Sent to everyone registered.</p>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => sendDraft(i)}
                              disabled={!(drafts[i] ?? '').trim() || broadcast.isPending}
                              className="rounded-lg bg-teal px-3 py-1.5 text-[12px] font-bold text-onyx transition-colors hover:bg-teal-accent disabled:opacity-50"
                            >
                              {broadcast.isPending ? 'Sending…' : 'Send it'}
                            </button>
                            <span className="text-[11px] text-graytext-mid">You send this, not the assistant.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Honesty about which engine answered: a keyword match should
                        never be passed off as a written reply. */}
                    {t.source === 'keyword' && (
                      <p className="text-[11px] text-graytext-mid">Matched by keyword — AI replies are not configured.</p>
                    )}
                  </div>
                ) : (
                  <div className="w-fit rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-graytext-mid">
                    Thinking…
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); submit(q) }}
            className="flex gap-2 border-t border-white/10 p-3"
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={inEventMode ? 'Ask about this event…' : 'How do I…?'}
              maxLength={500}
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[13px] text-offwhite outline-none transition-colors focus:border-teal"
            />
            <button
              type="submit"
              disabled={!q.trim() || ask.isPending}
              className={cx(
                'rounded-xl px-3 py-2 text-[13px] font-bold transition-colors',
                !q.trim() || ask.isPending
                  ? 'bg-white/5 text-graytext-mid'
                  : 'bg-teal text-onyx hover:bg-teal-accent',
              )}
            >
              Ask
            </button>
          </form>
        </div>
      )}
    </>
  )
}
