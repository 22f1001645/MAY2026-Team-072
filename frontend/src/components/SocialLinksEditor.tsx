import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Input } from './ui'
import { cx } from '../lib/format'
import type { OrgProfile } from '../lib/types'

/* The social links editor — ORG-02, 04-UI-SPEC.md S4.
 *
 * Seven fields: the website field, rendered above and visually separated from
 * the six platform rows, and never a seventh row. D-03 models it as a distinct
 * field so ROADMAP criterion 2's sentence stays literally true of every
 * social-link row, and this separation is where that honesty becomes visible to
 * the only person who could notice it.
 *
 * The client never pre-validates a URL. The server owns that rule — one
 * validator, on the write path, mirrored on the read path — and a second,
 * weaker copy here would be exactly the divergence this phase exists to
 * prevent. `Save links` therefore stays enabled at all times and is disabled
 * only while a request is in flight. */

/** The six allowlisted platforms, in their fixed display order. All six rows
 *  always render — the set is closed, so an add/remove UI over it is more
 *  machinery than the six rows themselves. */
export const PLATFORM_KEYS = ['instagram', 'linkedin', 'x', 'youtube', 'facebook', 'github']

/** Locked display names, never derived from the key by capitalisation: `x` →
 *  "X" and `github` → "GitHub" both break that rule, and a wrong-cased brand
 *  name is the kind of detail this page exists to get right. Carries the
 *  website row too, so a rejection on that field names it the same way. */
export const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X',
  youtube: 'YouTube',
  facebook: 'Facebook',
  github: 'GitHub',
  website: 'Website',
}

export const PLATFORM_PLACEHOLDERS: Record<string, string> = {
  instagram: 'https://instagram.com/…',
  linkedin: 'https://linkedin.com/company/…',
  x: 'https://x.com/…',
  youtube: 'https://youtube.com/@…',
  facebook: 'https://facebook.com/…',
  github: 'https://github.com/…',
  website: 'https://yourorg.example.org',
}

/* Headings are chosen from the envelope `code` and never by string-matching the
 * message. The message is the server's own sentence and is rendered verbatim
 * beneath our heading. */
const ERROR_HEADINGS: Record<string, string> = {
  social_url_scheme: 'That link needs to start with http:// or https://',
  social_url_host: "That doesn't look like a {Platform} address",
  duplicate_platform: 'One link per platform',
  validation_error: 'Check this link',
}

function errorHeading(code: string | undefined, target: string | null) {
  const raw = (code && ERROR_HEADINGS[code]) || 'Check this link'
  return raw.replace('{Platform}', (target && PLATFORM_LABELS[target]) || 'valid')
}

/** The envelope shape this component reads. `ApiError` satisfies it; the type is
 *  stated structurally so the resolver below stays unit-testable without one. */
export type Rejection = { code?: string; message?: string; details?: unknown }

export type PlacedRejection = { target: string | null; heading: string; body?: string }

/** Decide which field a rejection belongs to, and what to say above the
 *  server's sentence.
 *
 *  A 400 from `url_safety` carries `details: { platform }` for a row or
 *  `details: { field: 'website' }` for the website field. A 422 carries
 *  marshmallow's nested `messages`, keyed by field and then by the row's index
 *  in the payload we sent — which is why `sentOrder` is threaded through rather
 *  than assuming the index matches the display order: blank rows are omitted
 *  from the payload, so the two differ as soon as one row is empty.
 *
 *  When no row can be resolved the caller renders the message once at section
 *  level. That is the documented degraded fallback: legible, but it makes the
 *  user hunt, so it is the last resort rather than the design. */
export function resolveRejection(
  err: Rejection | null | undefined,
  sentOrder: string[],
): PlacedRejection | null {
  if (!err) return null

  const details = (err.details ?? null) as Record<string, unknown> | null
  let target: string | null = null
  let body = err.message

  if (err.code === 'validation_error' && details) {
    if (details.website) {
      target = 'website'
      body = firstMessage(details.website) ?? body
    } else if (details.links && typeof details.links === 'object') {
      const rows = Object.entries(details.links as Record<string, unknown>)
      if (rows.length > 0) {
        const [index, rowErrors] = rows[0]
        target = sentOrder[Number(index)] ?? null
        body = firstMessage(rowErrors) ?? body
      }
    }
  } else if (details) {
    if (typeof details.platform === 'string') target = details.platform
    else if (typeof details.field === 'string') target = details.field
  }

  return { target, heading: errorHeading(err.code, target), body }
}

/** Walk marshmallow's nested structure down to the first actual sentence, so a
 *  raw serialised object is never rendered to a user. */
function firstMessage(node: unknown): string | undefined {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return firstMessage(node[0])
  if (node && typeof node === 'object') return firstMessage(Object.values(node)[0])
  return undefined
}

const fieldId = (key: string) => `link-${key}`

const CAPTION_LABEL = 'block text-caption font-semibold uppercase tracking-wider text-graytext-light'

/** The row shell, used verbatim by the palette swatches and the sample phrases
 *  too — three lists on one page at three row heights would read as three
 *  unrelated widgets. */
const ROW_SHELL =
  'flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2'

export function SocialLinksEditor({
  org,
  saving,
  error,
  onSave,
  onCancel,
}: {
  org: OrgProfile
  saving: boolean
  error: Rejection | null
  onSave: (payload: { links: { platform: string; url: string }[]; website: string }) => void
  onCancel: () => void
}) {
  /* Seeded once from the page's own profile query — there is no second fetch,
   * and `Save links` is the busy interaction state for this section. */
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = { website: org.website ?? '' }
    for (const key of PLATFORM_KEYS) seed[key] = ''
    for (const link of org.socialLinks) seed[link.platform] = link.url
    return seed
  })

  /* The platform order of the last payload actually sent, so a 422 keyed by row
   * index lands on the row the user typed into rather than on whatever sits at
   * that index in the display order. */
  const sentOrder = useRef<string[]>([])
  const strip = useRef<HTMLDivElement | null>(null)

  const rejection = resolveRejection(error, sentOrder.current)

  useEffect(() => {
    if (!error) return
    const placed = resolveRejection(error, sentOrder.current)
    if (placed?.target) {
      document.getElementById(fieldId(placed.target))?.focus()
    } else {
      strip.current?.scrollIntoView({ block: 'center' })
      strip.current?.focus()
    }
  }, [error])

  const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }))

  const submit = () => {
    // Replace-all: a blank row is simply omitted, which is what "leave a row
    // blank to remove that link" means on the wire.
    const links: { platform: string; url: string }[] = []
    for (const key of PLATFORM_KEYS) {
      const url = values[key].trim()
      if (url) links.push({ platform: key, url })
    }
    sentOrder.current = links.map((l) => l.platform)
    onSave({ links, website: values.website.trim() })
  }

  /* A row the server saved earlier but no longer vouches for arrives here as a
   * key with no URL: the editor is populated from the same filtered payload the
   * read view uses, so without this the row would look like it was never saved.
   * The offending URL is never rendered, never placed in a value and never
   * reaches the DOM — the server sends keys only. */
  const flagged = new Set(org.withheldPlatforms)

  return (
    <div>
      <div>
        <label htmlFor={fieldId('website')} className={cx(CAPTION_LABEL, 'mb-2')}>
          Website
        </label>
        <Input
          id={fieldId('website')}
          value={values.website}
          onChange={(e) => set('website', e.target.value)}
          placeholder={PLATFORM_PLACEHOLDERS.website}
          className={cx(
            'focus-visible:ring-2 focus-visible:ring-teal/50',
            rejection?.target === 'website' && 'border-red-400/50',
          )}
        />
        {rejection?.target === 'website' ? (
          <FieldRejection heading={rejection.heading} body={rejection.body} />
        ) : (
          <p className="mt-2 text-caption text-graytext-light">
            Your organisation's own site — any address, as long as it starts with http:// or
            https://.
          </p>
        )}
      </div>

      <div className="mt-6">
        <div className={CAPTION_LABEL}>Social profiles</div>
        <p className="mt-2 text-caption text-graytext-light">
          We check these against each platform's own address, so a link here can't quietly point
          somewhere else.
        </p>

        <div className="mt-4 space-y-2">
          {PLATFORM_KEYS.map((key) => {
            const rejected = rejection?.target === key
            const savedEarlier = flagged.has(key) && !values[key]
            return (
              <div key={key}>
                <div className={ROW_SHELL}>
                  <label
                    htmlFor={fieldId(key)}
                    className="w-24 shrink-0 text-[14px] text-graytext-light"
                  >
                    {PLATFORM_LABELS[key]}
                  </label>
                  {savedEarlier && (
                    <span className="shrink-0">
                      <Badge tone="warn">Hidden</Badge>
                    </span>
                  )}
                  <Input
                    id={fieldId(key)}
                    value={values[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={PLATFORM_PLACEHOLDERS[key]}
                    className={cx(
                      'flex-1 focus-visible:ring-2 focus-visible:ring-teal/50',
                      rejected && 'border-red-400/50',
                    )}
                  />
                </div>
                {/* Amber, not red — the user did nothing wrong. */}
                {savedEarlier && (
                  <p className="mt-1 text-caption text-amber-300">
                    This link was saved earlier but is no longer safe to show. Enter it again to
                    restore it.
                  </p>
                )}
                {rejected && <FieldRejection heading={rejection.heading} body={rejection.body} />}
              </div>
            )
          })}
        </div>

        <p className="mt-2 text-caption text-graytext-light">
          Leave a row blank to remove that link.
        </p>
      </div>

      {/* The degraded fallback: a rejection we could not place on a row is still
          shown, once, rather than swallowed. */}
      {rejection && !rejection.target && (
        <div
          ref={strip}
          role="alert"
          tabIndex={-1}
          className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-[14px] text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
        >
          <div className="font-semibold">{rejection.heading}</div>
          {rejection.body && <div className="mt-1">{rejection.body}</div>}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        {/* Never pre-disabled on a client-side URL check: a greyed button with
            no explanation is a worse dead end than one round trip. */}
        <Button type="button" onClick={submit} disabled={saving} aria-busy={saving || undefined}>
          {saving ? 'Saving…' : 'Save links'}
        </Button>
      </div>
    </div>
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
