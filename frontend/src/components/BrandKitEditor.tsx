import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, Dialog, Input, Textarea, useToast } from './ui'
import { CAPTION_LABEL, ROW_SHELL, firstMessage, type Rejection } from './SocialLinksEditor'
import { cx } from '../lib/format'
import { useBrandKit, useDraftBrandKit, useSaveBrandKit } from '../lib/queries'
import type { ApiError } from '../lib/api'
import type { BrandKit } from '../lib/types'

/* The brand kit — ORG-03, 04-UI-SPEC.md S6.
 *
 * Visibility (P-09): the whole card renders **iff `canEdit`**, and the query is
 * gated on the same value so the request is never issued for a non-manager.
 * `GET /brand-kit` is `can_manage_org_required`, so a non-manager would get a
 * 403 — but the rule is that the request is never made, not that the error is
 * swallowed. Beyond the status code: a brand kit is an internal working
 * document for an organisation's own communications, not part of its public
 * identity, so an empty or errored card would advertise a surface the reader
 * can never use.
 *
 * Every bound below lives on the server (`BrandKitSchema`). The counters here
 * are a courtesy, never a gate: no field is hard-capped in the markup, because
 * a hard cap silently truncates a paste, and `Save brand kit` is never
 * pre-disabled on a client-side guess of a server rule (Interaction State C). */

const VOICE_LIMIT = 500
const VOICE_COUNTER_FROM = 400
const PHRASE_LIMIT = 200
const PHRASE_COUNTER_FROM = 160
const MAX_COLOURS = 6
const MAX_PHRASES = 10

/** A colour a user is halfway through typing is not a valid value for the
 *  native colour input, and the browser silently rewrites an invalid one to
 *  `#000000`. The picker therefore falls back to the same "obviously unset"
 *  white a new row starts at, while the text field keeps exactly what was
 *  typed — the text is the value. */
const HEX = /^#[0-9a-fA-F]{6}$/
const pickerValue = (hex: string) => (HEX.test(hex.trim()) ? hex.trim() : '#ffffff')

type Field = 'voice' | 'palette' | 'phrases'
export type KitRejection = {
  field: Field | null
  index: number | null
  heading: string
  body?: string
}

/** The display indices of the rows actually sent, in payload order. Blank rows
 *  are dropped from the payload, so a 422 keyed by payload index has to be
 *  mapped back or it lands on the wrong row the moment one row is empty. */
export type SentRows = { palette: number[]; phrases: number[] }

/* Headings are chosen from the envelope `code` and the field the server named —
 * never by string-matching the message. The message is the server's own
 * sentence and is rendered verbatim beneath our heading. */
const PALETTE_HEADING = 'Colours must be six-digit hex, like #5ce6c9'
const GENERIC_HEADING = 'Could not save your changes'

/** Place a save rejection on the row that caused it.
 *
 *  Marshmallow nests list errors as `{ palette: { "0": ["…"] } }` for a bad
 *  entry and flattens them to `{ palette: ["…"] }` when the list itself is too
 *  long — both are handled, the second at field level. When nothing can be
 *  resolved the caller renders the message once at section level: legible, but
 *  it makes the user hunt, so it is the last resort rather than the design. */
export function resolveKitRejection(
  err: Rejection | null | undefined,
  sent: SentRows,
): KitRejection | null {
  if (!err) return null

  const details = (err.details ?? null) as Record<string, unknown> | null
  const place = (key: 'palette' | 'sample_phrases' | 'voice_tone'): KitRejection | null => {
    const node = details?.[key]
    if (!node) return null
    const field: Field = key === 'palette' ? 'palette' : key === 'sample_phrases' ? 'phrases' : 'voice'
    const heading = field === 'palette' ? PALETTE_HEADING : GENERIC_HEADING
    if (Array.isArray(node) || typeof node === 'string') {
      return { field, index: null, heading, body: firstMessage(node) ?? err.message }
    }
    const [index, rowErrors] = Object.entries(node as Record<string, unknown>)[0] ?? []
    const row = field === 'palette' ? sent.palette : sent.phrases
    return {
      field,
      index: index === undefined ? null : (row[Number(index)] ?? null),
      heading,
      body: firstMessage(rowErrors) ?? err.message,
    }
  }

  if (err.code === 'validation_error' && details) {
    const placed = place('palette') ?? place('sample_phrases') ?? place('voice_tone')
    if (placed) return placed
  }

  return { field: null, index: null, heading: GENERIC_HEADING, body: err.message }
}

/* The AI draft — ORG-04, 04-UI-SPEC.md S7.
 *
 * The structural decision: a returned draft **populates the live form fields in
 * place.** There is no preview panel, no side-by-side diff, no modal and no
 * second control that commits it. Criterion 4 requires the user to be able to
 * edit *every* field, and a preview-then-apply flow creates a second write
 * surface and a second review moment — which is precisely the second
 * brand-kit-writer anti-pattern this phase exists to avoid. `PUT /brand-kit` is
 * the only writer and `Save brand kit` is the only button that reaches it.
 *
 * The draft is never cached. Not in a persisted query key and not in any client
 * storage: it lives in component state and dies with the component. A draft
 * that survived a reload would be indistinguishable, to anyone checking
 * criterion 4, from something having been applied.
 *
 * The AI provider is never named in user-facing copy. It is swappable behind a
 * lazy-import seam on the server, and a brand name here would turn a
 * configuration change into a copy change. */

const AI_UNAVAILABLE_REASON =
  "AI drafting isn't set up on this server. Fill the kit in yourself — every field below works without it."
const DRAFT_MIN_VISIBLE_MS = 300
const DRAFT_SLOW_AFTER_MS = 1200
const DRAFT_TIMEOUT_MS = 30_000

/* Headings come from the envelope `code`, never from string-matching. */
const AI_ERROR_HEADINGS: Record<string, string> = {
  ai_unavailable: "AI drafting isn't available right now",
  ai_failed: "The draft didn't come through",
}
const AI_GENERIC_HEADING = 'Could not draft a brand kit'
const AI_TIMEOUT_BODY = 'Nothing changed. Try again, or fill the kit in yourself.'

const voiceId = 'kit-voice'
const hexId = (i: number) => `kit-colour-${i}`
const phraseId = (i: number) => `kit-phrase-${i}`

export function BrandKitEditor({
  orgId,
  canEdit,
  editing,
  blockedBy,
  onEdit,
  onCancel,
  onDirtyChange,
}: {
  orgId: string
  canEdit: boolean
  editing: boolean
  blockedBy: string | null
  onEdit: () => void
  onCancel: () => void
  /** Reported up so the page can own the single unsaved-work listener. Exactly
   *  one listener, owned by the page, never one per section. */
  onDirtyChange: (dirty: boolean) => void
}) {
  const { addToast } = useToast()
  const { data: kit, isLoading, isError, refetch } = useBrandKit(orgId, canEdit)
  const save = useSaveBrandKit()
  const draft = useDraftBrandKit()

  const [voice, setVoice] = useState('')
  const [palette, setPalette] = useState<string[]>([])
  const [phrases, setPhrases] = useState<string[]>([])

  /** The user's own typing since the form was last seeded or filled. It is the
   *  threshold for confirming a discard — the model's words are not the user's
   *  work, so an untouched draft goes without a question. */
  const [touched, setTouched] = useState(false)
  const [draftShown, setDraftShown] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [slow, setSlow] = useState(false)
  const [draftError, setDraftError] = useState<{ heading: string; body?: string } | null>(null)
  /** Flipped for the rest of the session when the server reports the feature
   *  gone: the availability flag was stale, and a second click would only
   *  repeat the same failure. */
  const [aiLocked, setAiLocked] = useState(false)
  const [dialog, setDialog] = useState<'discard' | 'draft' | null>(null)

  const sent = useRef<SentRows>({ palette: [], phrases: [] })
  const timers = useRef<number[]>([])
  const aborter = useRef<AbortController | null>(null)
  const timedOut = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  const rejection = resolveKitRejection(save.isError ? (save.error as ApiError) : null, sent.current)

  const dirty = editing && (draftShown || touched)
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange])

  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
  }
  useEffect(
    () => () => {
      clearTimers()
      aborter.current?.abort()
    },
    [],
  )

  const seed = (from?: BrandKit) => {
    setVoice(from?.voiceTone ?? '')
    setPalette(from?.palette ?? [])
    setPhrases(from?.samplePhrases ?? [])
    setTouched(false)
  }

  const startEdit = () => {
    save.reset()
    seed(kit)
    onEdit()
  }

  const cancelEdit = () => {
    save.reset()
    setDraftShown(false)
    setDraftError(null)
    onCancel()
  }

  const setColour = (i: number, value: string) => {
    setTouched(true)
    setPalette((prev) => prev.map((c, n) => (n === i ? value : c)))
  }
  const setPhrase = (i: number, value: string) => {
    setTouched(true)
    setPhrases((prev) => prev.map((p, n) => (n === i ? value : p)))
  }

  const aiAvailable = !!kit?.aiAvailable && !aiLocked

  /** The draft fills the live fields and nothing else. Nothing here reaches a
   *  writer — that is `Save brand kit`'s job alone. */
  const fillFrom = (drafted: BrandKit) => {
    setVoice(drafted.voiceTone ?? '')
    setPalette(drafted.palette)
    setPhrases(drafted.samplePhrases)
    setTouched(false)
    setDraftShown(true)
    setDraftError(null)
    if (!editing) {
      save.reset()
      onEdit()
    }
  }

  const runDraft = () => {
    setDraftError(null)
    setSlow(false)
    setDrafting(true)
    timedOut.current = false

    const controller = new AbortController()
    aborter.current = controller
    const started = Date.now()
    timers.current.push(
      window.setTimeout(() => {
        // A hung provider call must not freeze the surface indefinitely.
        timedOut.current = true
        controller.abort()
      }, DRAFT_TIMEOUT_MS),
      window.setTimeout(() => setSlow(true), DRAFT_SLOW_AFTER_MS),
    )

    draft.mutate(
      { id: orgId, signal: controller.signal },
      {
        onSettled: (drafted, err) => {
          clearTimers()
          aborter.current = null
          // Held for the minimum visible duration, so a fast answer does not
          // flash a busy state the user cannot read.
          const wait = Math.max(0, DRAFT_MIN_VISIBLE_MS - (Date.now() - started))
          timers.current.push(
            window.setTimeout(() => {
              setDrafting(false)
              setSlow(false)
              if (drafted) {
                fillFrom(drafted)
                return
              }
              if (timedOut.current) {
                setDraftError({ heading: AI_GENERIC_HEADING, body: AI_TIMEOUT_BODY })
                return
              }
              const apiErr = err as ApiError
              setDraftError({
                heading: AI_ERROR_HEADINGS[apiErr?.code] ?? AI_GENERIC_HEADING,
                body: apiErr?.message,
              })
              if (apiErr?.code === 'ai_unavailable') setAiLocked(true)
            }, wait),
          )
        },
      },
    )
  }

  /** No request is sent and no toast fires — nothing was ever on the server to
   *  undo. The form goes back to the saved kit, or to an empty form when there
   *  is none. */
  const discardDraft = () => {
    seed(kit)
    setDraftShown(false)
    setDraftError(null)
  }

  const openDialog = (kind: 'discard' | 'draft') => {
    trigger.current = document.activeElement as HTMLElement | null
    setDialog(kind)
  }

  const closeDialog = () => {
    setDialog(null)
    trigger.current?.focus()
  }

  const confirmDialog = () => {
    const kind = dialog
    discardDraft()
    setDialog(null)
    trigger.current?.focus()
    if (kind === 'draft') runDraft()
  }

  useEffect(() => {
    if (!dialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDialog()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog])

  const submit = () => {
    // A blank row is a user who changed their mind, not a value — it is dropped
    // rather than sent, and the display indices of what was sent are kept so a
    // 422 lands on the row the user typed into.
    const paletteIdx: number[] = []
    const paletteOut: string[] = []
    palette.forEach((c, i) => {
      const v = c.trim()
      if (v) {
        paletteIdx.push(i)
        paletteOut.push(v)
      }
    })
    const phraseIdx: number[] = []
    const phrasesOut: string[] = []
    phrases.forEach((p, i) => {
      const v = p.trim()
      if (v) {
        phraseIdx.push(i)
        phrasesOut.push(v)
      }
    })
    sent.current = { palette: paletteIdx, phrases: phraseIdx }

    save.mutate(
      {
        id: orgId,
        payload: {
          voice_tone: voice.trim() ? voice : null,
          palette: paletteOut,
          sample_phrases: phrasesOut,
          // Provenance: a kit the user kept after a draft is recorded as having
          // come from one. It is not approval state and it grants nothing.
          source: draftShown ? 'ai_draft' : (kit?.hasKit ? kit.source : 'manual'),
        },
      },
      {
        onSuccess: () => {
          // The read view re-renders from the server's own response: the server
          // lowercases hexes and strips phrases, and the user must see what was
          // actually saved.
          addToast('Brand kit saved', 'success')
          setDraftShown(false)
          setDraftError(null)
          onCancel()
        },
      },
    )
  }

  const body = () => {
    if (isLoading) {
      return <p className="text-caption text-graytext-mid">Loading the brand kit…</p>
    }
    if (isError || !kit) {
      return (
        <div>
          <p className="text-caption text-graytext-light">Could not load the brand kit.</p>
          <div className="mt-4">
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )
    }
    if (editing) return form()
    if (!kit.hasKit) {
      return <p className="text-caption text-graytext-mid">No brand kit yet.</p>
    }
    return read(kit)
  }

  const read = (k: BrandKit) => (
    <div className="space-y-4">
      {k.voiceTone && (
        <p className="max-w-prose whitespace-pre-line text-body text-offwhite">{k.voiceTone}</p>
      )}
      {k.palette.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {k.palette.map((hex, i) => (
            <div key={`${hex}-${i}`} className="shrink-0">
              <div
                className="h-9 w-9 rounded-lg border border-white/20"
                style={{ background: hex }}
              />
              {/* The hex text, not the chip, is the value — colour is the one
                  piece of content on this page, which is exactly why it is
                  never the only channel. */}
              <div className="mt-1 text-caption text-graytext-light">{hex}</div>
            </div>
          ))}
        </div>
      )}
      {k.samplePhrases.length > 0 && (
        <ul className="space-y-2 text-[14px] text-offwhite">
          {k.samplePhrases.map((p, i) => (
            <li key={`${p}-${i}`}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  )

  const form = () => (
    // One disabled group rather than a `disabled` on every field: while a draft
    // is in flight the whole Brand kit card is busy, and the Profile and Links
    // sections deliberately are not. The hex text field is never individually
    // disabled — typing is the accessible path and it is never taken away.
    <fieldset disabled={drafting} className="contents">
      <div className="space-y-4">
        {/* The draft is atomic: one strip over the whole form, never a
            per-field marker. Six provenance captions scattered through a form
            is clutter, and once the user edits one field the per-field claim
            stops being true anyway. Gold, and the only gold surface this phase
            adds — the class string is Phase 2's banner, lifted whole. */}
        {draftShown && (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-offwhite">
                This is an AI draft. Nothing is saved yet.
              </div>
              <p className="mt-1 text-caption text-graytext-light">
                Edit anything below, then press Save brand kit. Discard draft puts back what was
                there before.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => (touched ? openDialog('discard') : discardDraft())}
            >
              Discard draft
            </Button>
          </div>
        )}

        <div>
          <label htmlFor={voiceId} className={cx(CAPTION_LABEL, 'mb-2')}>
            Voice &amp; tone
          </label>
          {/* No hard cap: truncating a paste silently is worse than letting the
              server say why. */}
          <Textarea
            id={voiceId}
            rows={3}
            value={voice}
            onChange={(e) => {
              setTouched(true)
              setVoice(e.target.value)
            }}
            placeholder="Warm, student-led, a little irreverent. Never corporate."
            className={cx(rejection?.field === 'voice' && 'border-red-400/50')}
          />
          {rejection?.field === 'voice' ? (
            <FieldRejection heading={rejection.heading} body={rejection.body} />
          ) : (
            <p className="mt-2 text-caption text-graytext-light">
              A few words describing how your organisation sounds. The campaign writer reads this.
            </p>
          )}
          <Counter n={voice.length} max={VOICE_LIMIT} from={VOICE_COUNTER_FROM} />
        </div>

        <div>
          <div className={CAPTION_LABEL}>Colours</div>
          <p className="mt-2 text-caption text-graytext-light">
            Up to six. Shown against Ekatva's dark background — how they look in a campaign depends
            on the template.
          </p>

          <div className="mt-4 space-y-2">
            {palette.map((hex, i) => {
              const rejected = rejection?.field === 'palette' && rejection.index === i
              return (
                <div key={i}>
                  <div className={ROW_SHELL}>
                    {/* The swatch itself is the picker: one control, the
                        platform's own colour UI, zero new dependencies. The
                        border is `border-white/20` and never teal — teal chrome
                        on a user's own colour would misread as "selected". */}
                    <span className="relative block h-9 w-9 shrink-0">
                      {/* The input is written first so `peer-focus-visible` on
                          the swatch resolves — Tailwind's peer variant compiles
                          to a general sibling combinator, so the peer must come
                          first in the DOM. The input stays on top and clickable
                          because a positioned element paints above in-flow
                          siblings regardless of source order. Without this the
                          `opacity-0` input swallows its own focus ring and the
                          picker has no visible keyboard indicator at all. */}
                      <input
                        type="color"
                        value={pickerValue(hex)}
                        aria-label={`Pick colour ${i + 1}`}
                        onChange={(e) => setColour(i, e.target.value.toLowerCase())}
                        className="peer absolute inset-0 h-9 w-9 cursor-pointer opacity-0 focus:outline-none"
                      />
                      <span
                        className="block h-9 w-9 rounded-lg border border-white/20 peer-focus-visible:ring-2 peer-focus-visible:ring-teal/50"
                        style={{ background: hex }}
                      />
                    </span>
                    {/* Typing is the accessible path — a native colour picker is
                        not keyboard-operable on every platform — so this field
                        is never disabled, never read-only and never removed. */}
                    <Input
                      id={hexId(i)}
                      value={hex}
                      onChange={(e) => setColour(i, e.target.value)}
                      onBlur={(e) => setColour(i, e.target.value.toLowerCase())}
                      placeholder="#5ce6c9"
                      className={cx(
                        'flex-1 focus-visible:ring-2 focus-visible:ring-teal/50',
                        rejected && 'border-red-400/50',
                      )}
                    />
                    <RemoveButton
                      label={`Remove colour ${hex}`}
                      onClick={() => {
                        setTouched(true)
                        setPalette((prev) => prev.filter((_, n) => n !== i))
                      }}
                    />
                  </div>
                  {rejected && (
                    <FieldRejection heading={rejection.heading} body={rejection.body} />
                  )}
                </div>
              )
            })}
          </div>

          {/* A control that cannot be enabled without first removing something
              is noise; the caption is the explanation. */}
          {palette.length < MAX_COLOURS ? (
            <div className="mt-2">
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => {
                  setTouched(true)
                  setPalette((prev) => [...prev, '#ffffff'])
                }}
              >
                Add a colour
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-caption text-graytext-light">Six colours is the maximum.</p>
          )}
          {rejection?.field === 'palette' && rejection.index === null && (
            <FieldRejection heading={rejection.heading} body={rejection.body} />
          )}
        </div>

        <div>
          <div className={CAPTION_LABEL}>Sample phrases</div>
          <p className="mt-2 text-caption text-graytext-light">
            Up to ten lines your organisation actually uses. The campaign writer borrows their
            rhythm.
          </p>

          <div className="mt-4 space-y-2">
            {phrases.map((phrase, i) => {
              const rejected = rejection?.field === 'phrases' && rejection.index === i
              return (
                <div key={i}>
                  <div className={ROW_SHELL}>
                    <Input
                      id={phraseId(i)}
                      value={phrase}
                      onChange={(e) => setPhrase(i, e.target.value)}
                      placeholder="One line your organisation actually uses."
                      className={cx(
                        'flex-1 focus-visible:ring-2 focus-visible:ring-teal/50',
                        rejected && 'border-red-400/50',
                      )}
                    />
                    <RemoveButton
                      label={`Remove phrase ${i + 1}`}
                      onClick={() => {
                        setTouched(true)
                        setPhrases((prev) => prev.filter((_, n) => n !== i))
                      }}
                    />
                  </div>
                  {rejected && (
                    <FieldRejection heading={rejection.heading} body={rejection.body} />
                  )}
                  <Counter n={phrase.length} max={PHRASE_LIMIT} from={PHRASE_COUNTER_FROM} />
                </div>
              )
            })}
          </div>

          {phrases.length < MAX_PHRASES ? (
            <div className="mt-2">
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => {
                  setTouched(true)
                  setPhrases((prev) => [...prev, ''])
                }}
              >
                Add a phrase
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-caption text-graytext-light">Ten phrases is the maximum.</p>
          )}
          {rejection?.field === 'phrases' && rejection.index === null && (
            <FieldRejection heading={rejection.heading} body={rejection.body} />
          )}
        </div>

        {/* The degraded fallback: a rejection we could not place on a field is
            still shown, once, rather than swallowed. */}
        {rejection && !rejection.field && (
          <div
            role="alert"
            className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-[14px] text-red-300"
          >
            <div className="font-semibold">{rejection.heading}</div>
            {rejection.body && <div className="mt-1">{rejection.body}</div>}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={cancelEdit} disabled={save.isPending}>
          Cancel
        </Button>
        {/* Never pre-disabled on a client-side guess of a server rule. */}
        <Button
          type="button"
          onClick={submit}
          disabled={save.isPending}
          aria-busy={save.isPending || undefined}
        >
          {save.isPending ? 'Saving…' : 'Save brand kit'}
        </Button>
      </div>
    </fieldset>
  )

  /* The AI control and everything that explains it. It sits directly under the
   * heading row and above the field stack, because A5's failure strip has to
   * render *above the Draft control* and its own explanation *below* it, and a
   * two-sentence caption right-aligned inside a header row is unreadable at
   * 320px. Never in the save-error slot, which belongs to the write. */
  const aiBlock = () => {
    if (!kit || isLoading || isError || blockedBy) return null
    const label = kit.hasKit ? 'Draft a new version with AI' : 'Draft with AI'

    // A0: render-locked, never hidden and never a bare disabled button. The
    // control's absence would be indistinguishable from the feature not
    // existing, and a phase success criterion requires it be discoverable.
    if (!aiAvailable) {
      return (
        <div className="mb-4">
          <LockedControl label={label} reason={AI_UNAVAILABLE_REASON} />
        </div>
      )
    }

    return (
      <div className="mb-4">
        {draftError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3"
          >
            <div className="text-[14px] font-semibold text-red-300">{draftError.heading}</div>
            {draftError.body && <p className="mt-1 text-caption text-red-300">{draftError.body}</p>}
          </div>
        )}
        <Button
          size="sm"
          variant="secondary"
          type="button"
          disabled={drafting}
          aria-busy={drafting || undefined}
          onClick={() => (dirty ? openDialog('draft') : runDraft())}
        >
          {drafting ? 'Drafting…' : label}
        </Button>
        <p className="mt-2 text-caption text-graytext-light">
          {kit.hasKit
            ? "This replaces what's in the form. Your saved kit isn't touched until you press Save brand kit."
            : 'Gives you a starting point. Nothing is saved until you press Save brand kit.'}
        </p>
        {/* Announced once when it appears. It is not a second `status` region:
            this phase has exactly one, the gold strip. */}
        {slow && (
          <p aria-live="polite" className="mt-2 text-caption text-graytext-light">
            Still drafting — this takes a few seconds.
          </p>
        )}
      </div>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-h3 font-semibold text-gold">Brand kit</h2>
          {/* Provenance, not approval state: it means someone reviewed this and
              kept it. */}
          {kit?.hasKit && kit.source === 'ai_draft' && <Badge tone="neutral">AI draft</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {!editing && !blockedBy && !isLoading && !isError && (
            <Button size="sm" variant="secondary" onClick={startEdit}>
              Edit
            </Button>
          )}
          {blockedBy && <LockedControl label="Edit" reason={`Finish editing ${blockedBy} first.`} />}
        </div>
      </div>

      {aiBlock()}
      {body()}

      <Dialog open={dialog !== null} onClose={closeDialog} title="Discard your edits?">
        <p className="text-body text-graytext-light">
          You've changed the draft. Discarding puts back{' '}
          {kit?.hasKit ? 'the kit you saved earlier' : 'an empty form'}.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" type="button" autoFocus onClick={closeDialog}>
            Cancel
          </Button>
          <Button variant="danger" type="button" onClick={confirmDialog}>
            Discard draft
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}

/** Renders only once the field is close to its limit, and turns red past it.
 *  The number itself is the second channel, so colour is never carrying the
 *  state alone. */
function Counter({ n, max, from }: { n: number; max: number; from: number }) {
  if (n < from) return null
  const over = n > max
  return (
    <p className={cx('mt-1 text-caption', over ? 'text-red-300' : 'text-graytext-mid')}>
      {over ? `${n}/${max} — trim ${n - max} characters.` : `${n}/${max}`}
    </p>
  )
}

/** 36px, an `aria-label` naming the object it acts on, and the same string as
 *  `title`. Both, always — no icon-only control in this phase ships without
 *  either. Removal gets no confirmation: it happens inside an unsaved section,
 *  nothing persists until Save brand kit, and Cancel restores everything. */
function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-graytext-light transition duration-200 ease-material hover:border-red-400/40 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function FieldRejection({ heading, body }: { heading: string; body?: string }) {
  return (
    <p className="mt-1 text-caption text-red-300">
      <span className="font-semibold">{heading}</span>
      {body && <span className="mt-1 block">{body}</span>}
    </p>
  )
}

/* Render-locked is a specific visual contract, not a bare `disabled`: the label
 * is unchanged, a padlock marks it, and the condition is stated in a *visible*
 * line as well as the title, because a tooltip alone is unreachable on touch.
 * It stays hoverable and focusable — pointer events are never switched off,
 * because an explanation nobody can hover is not an explanation. */
function LockedControl({ label, reason }: { label: string; reason: string }) {
  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        disabled
        aria-disabled="true"
        title={reason}
        className="cursor-not-allowed opacity-40"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        {label}
      </Button>
      <p className="mt-2 text-caption text-graytext-light">{reason}</p>
    </div>
  )
}
