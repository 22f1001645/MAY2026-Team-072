import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../lib/api'
import {
  useCapabilities,
  useOrgProfile,
  useUpdateOrgProfile,
  useUploadOrgLogo,
} from '../lib/queries'
import { Badge, Button, Card, Dialog, SectionTitle, Select, Textarea, useToast } from '../components/ui'
import { ErrorState, Loading } from '../components/states'
import { OrgLogo, resolveRung } from '../components/OrgLogo'
import { cx } from '../lib/format'

/* The organisation profile — ORG-01, 04-UI-SPEC.md S1/S2/S3.
 *
 * One page, four org types. `org.type` is read for exactly two things: the type
 * Badge label, and (inside OrgLogo) whether the seeded house mark is eligible.
 * There is no branch on it anywhere else — no per-type layout, no per-type
 * field set, no per-type copy. "Across all four org types" is discharged by
 * there being nothing to branch on.
 *
 * Edit rights are `capabilities.manageableOrgIds.includes(orgId)`, computed
 * once. Never a role, never an org name, never a city, never a POR string, and
 * never sent back to the API — `can_manage_org_required` on the server is the
 * actual control and this is only what renders. A viewer who does not manage
 * this organisation sees the complete read-only profile and no trace that an
 * editing surface exists: no Edit control, no greyed control, no padlock, no
 * permission line. The 403 is what a curl gets; nothing at all is what a
 * browser gets. */

const ORG_TYPE_LABEL: Record<string, string> = {
  house: 'Forest House',
  society: 'Society',
  region: 'Region',
  council: 'Council',
}

const SECTION_LABEL = { profile: 'Profile', links: 'Links', brandkit: 'Brand kit' } as const
type Section = keyof typeof SECTION_LABEL

const BIO_LIMIT = 1000
const BIO_COUNTER_FROM = 800
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_LIMIT_BYTES = 2 * 1024 * 1024

/** A stable empty array, so the memos below are not invalidated every render by
 *  a fresh `[]` while capabilities are still resolving. */
const NO_ORGS: string[] = []

/* Headings are chosen from the envelope `code`, never by string-matching the
 * message: the message is the server's sentence and is rendered verbatim
 * beneath our heading. */
const ERROR_HEADINGS: Record<string, string> = {
  invalid_image: "That file isn't a PNG, JPEG or WebP",
}

function errorHeading(code?: string) {
  return (code && ERROR_HEADINGS[code]) || 'Could not save your changes'
}

const sizeRejection = (bytes: number) =>
  `That file is ${(bytes / (1024 * 1024)).toFixed(1)} MB. The limit is 2 MB.`

export default function OrgProfile() {
  const { orgId = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { addToast } = useToast()

  const { data: capabilities } = useCapabilities()
  const manageableOrgIds = capabilities?.manageableOrgIds ?? NO_ORGS
  const canEdit = manageableOrgIds.includes(orgId)

  const { data: org, isLoading, isError, error } = useOrgProfile(orgId)

  const [editing, setEditing] = useState<Section | null>(null)
  const [bio, setBio] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [logoNotice, setLogoNotice] = useState<{ heading: string; body?: string } | null>(null)
  const [logoLoadFailed, setLogoLoadFailed] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  const saveProfile = useUpdateOrgProfile()
  const removeLogo = useUpdateOrgProfile()
  const uploadLogo = useUploadOrgLogo()

  const showSwitcher = manageableOrgIds.length > 1 && manageableOrgIds.includes(orgId)
  const { data: allOrgs = [] } = useQuery({
    queryKey: ['orgs'],
    queryFn: api.orgs,
    enabled: showSwitcher,
  })
  const switcherOptions = useMemo(
    () =>
      allOrgs
        .filter((o) => manageableOrgIds.includes(o.id))
        .map((o) => ({ label: o.name, value: o.id })),
    [allOrgs, manageableOrgIds],
  )

  const dirty = editing === 'profile' && bio !== (org?.bio ?? '')

  // The browser's own confirm covers the one loss the user did not initiate
  // through the app. In-app navigation is deliberately not blocked.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (!removeOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRemoveOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [removeOpen])

  if (isLoading) return <Loading label="Loading the organisation…" />

  // A 404 here is almost always a stale link rather than a failure, and
  // ErrorState's alarm language would misdescribe it.
  if (isError) {
    if ((error as ApiError)?.status === 404) {
      return (
        <Card className="mx-auto max-w-lg p-6 py-12 text-center">
          <div className="text-h3 font-semibold text-offwhite">That organisation doesn't exist.</div>
          <p className="mt-2 text-body text-graytext-light">The link may be out of date.</p>
          <div className="mt-6">
            <Button variant="ghost" onClick={() => navigate('/discover')}>
              Back to Discover
            </Button>
          </div>
        </Card>
      )
    }
    return <ErrorState error={error} />
  }

  if (!org) return null

  // What the data says renders, ignoring a runtime load failure; and what
  // clearing the upload would fall back to, so the remove dialog names the
  // real outcome instead of guessing at it.
  const liveRung = resolveRung(org)
  const fallbackRung = resolveRung(org, 2)
  const fallbackNote =
    liveRung === 1
      ? null
      : liveRung <= 3
        ? `Using the built-in ${org.name} mark`
        : `No logo yet. ${org.name} shows its initials.`
  const afterRemoval = fallbackRung <= 3 ? `the built-in ${org.name} mark` : 'its initials'

  // The one place the render-locked exception applies to authority: silently
  // discarding a half-written bio is worse than an honest dead end.
  const lostAccess = editing !== null && !canEdit
  const blockedBy = editing !== null && editing !== 'profile' ? SECTION_LABEL[editing] : null

  const startEdit = () => {
    setBio(org.bio ?? '')
    setLogoNotice(null)
    setEditing('profile')
  }

  const cancelEdit = () => {
    setEditing(null)
    setLogoNotice(null)
  }

  const submitProfile = () => {
    saveProfile.mutate(
      { id: orgId, payload: { bio } },
      {
        onSuccess: (data) => {
          // The read view re-renders from the server's own response, because
          // the server normalises what it stores and the user must see what
          // was actually saved.
          qc.setQueryData(['orgProfile', orgId], data)
          addToast('Profile saved', 'success')
          setEditing(null)
        },
      },
    )
  }

  const chooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so re-choosing the same file after a rejection still fires
    if (!file) return
    setLogoNotice(null)
    setLogoLoadFailed(false)

    // Immediate, explained rejections of an input that provably cannot
    // succeed — no request is sent. These are not a client-side copy of a
    // server rule: the magic-byte sniff on the server is still the gate, and
    // the `accept` attribute is a hint rather than one.
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoNotice({ heading: "PNG, JPEG or WebP only. SVG isn't accepted." })
      return
    }
    if (file.size > LOGO_LIMIT_BYTES) {
      setLogoNotice({ heading: sizeRejection(file.size) })
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    uploadLogo.mutate(
      { id: orgId, file },
      {
        onSuccess: (data) => {
          qc.setQueryData(['orgProfile', orgId], data)
          addToast('Logo updated', 'success')
        },
        onError: (err) => {
          const apiErr = err as ApiError
          setLogoNotice(
            apiErr?.status === 413
              ? { heading: sizeRejection(file.size) }
              : { heading: errorHeading(apiErr?.code), body: apiErr?.message },
          )
        },
        // Discarded either way: on success the server's URL has already
        // replaced it, on failure the tile snaps back to whichever rung was
        // live. A preview of a file the server refused is never left standing.
        onSettled: () => {
          URL.revokeObjectURL(objectUrl)
          setPreview(null)
        },
      },
    )
  }

  const confirmRemove = () => {
    removeLogo.mutate(
      { id: orgId, payload: { logo_url: null } },
      {
        onSuccess: (data) => {
          qc.setQueryData(['orgProfile', orgId], data)
          addToast('Logo removed', 'success')
          setRemoveOpen(false)
        },
      },
    )
  }

  const tile = (
    <OrgLogo
      org={org}
      size={80}
      previewUrl={preview}
      onLogoLoadError={() => setLogoLoadFailed(true)}
      className={cx(preview && 'opacity-60')}
    />
  )

  return (
    <div>
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {tile}
        <div className="min-w-0 flex-1">
          <SectionTitle eyebrow="Organisation" title={org.name} />
          <div className="flex flex-wrap gap-2">
            <Badge>{ORG_TYPE_LABEL[org.type] ?? org.type}</Badge>
            {org.city && <Badge tone="neutral">{org.city}</Badge>}
          </div>
        </div>
        {showSwitcher && (
          <Select
            className="w-full sm:w-64"
            value={orgId}
            onChange={(e) => navigate(`/orgs/${e.target.value}`)}
            options={switcherOptions}
          />
        )}
      </div>

      {/* Section order is locked: Profile → Links → Brand kit. Identity before
          contact before voice, and the brand kit last because it is the only
          section a reader never sees. `space-y-6` owns every gap between
          sections; no section adds a margin of its own. */}
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-h3 font-semibold text-gold">Profile</h2>
            {canEdit && editing === null && (
              <Button size="sm" variant="secondary" onClick={startEdit}>
                Edit
              </Button>
            )}
            {canEdit && blockedBy && (
              <LockedControl label="Edit" reason={`Finish editing ${blockedBy} first.`} />
            )}
          </div>

          {editing === 'profile' ? (
            <>
              <div className="space-y-4">
                <div>
                  {tile}
                  <div className="mt-2 flex items-center gap-2">
                    {/* The styled label is the focusable, keyboard-activatable
                        control; the input is visually hidden but still a real
                        input, so the focus ring has something to follow. */}
                    <label
                      aria-busy={uploadLogo.isPending || undefined}
                      className={cx(
                        'inline-flex cursor-pointer items-center gap-2 rounded-full bg-teal px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-onyx shadow-glow-teal transition duration-200 ease-material hover:bg-teal-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-teal/50',
                        uploadLogo.isPending && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadLogo.isPending}
                        onChange={chooseFile}
                      />
                      {uploadLogo.isPending
                        ? 'Uploading…'
                        : liveRung === 1
                          ? 'Replace logo'
                          : 'Upload a logo'}
                    </label>
                    {liveRung === 1 && (
                      <button
                        type="button"
                        onClick={() => setRemoveOpen(true)}
                        aria-label="Remove the logo"
                        title="Remove the logo"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-red-400/40 text-red-300 transition duration-200 ease-material hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
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
                          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {/* Disclosed where the user can act, never on the read view —
                      marking the fallback there would make the whole Houses
                      grid look unfinished on day one. */}
                  {fallbackNote && (
                    <p className="mt-2 text-caption text-graytext-light">{fallbackNote}</p>
                  )}
                  {logoLoadFailed && (
                    <p className="mt-2 text-caption text-amber-300">
                      That logo file couldn't be loaded. Upload it again.
                    </p>
                  )}
                  {logoNotice && (
                    <div className="mt-2">
                      <ErrorStrip heading={logoNotice.heading} body={logoNotice.body} />
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="org-bio"
                    className="mb-2 block text-caption font-semibold uppercase tracking-wider text-graytext-light"
                  >
                    Bio
                  </label>
                  {/* No hard cap: truncating a paste silently is worse than
                      letting the server say why. */}
                  <Textarea
                    id="org-bio"
                    rows={5}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="What your organisation is, who it's for, and what it's known for."
                  />
                  {bio.length >= BIO_COUNTER_FROM && (
                    <p
                      className={cx(
                        'mt-1 text-caption',
                        bio.length > BIO_LIMIT ? 'text-red-300' : 'text-graytext-mid',
                      )}
                    >
                      {bio.length > BIO_LIMIT
                        ? `${bio.length}/${BIO_LIMIT} — trim ${bio.length - BIO_LIMIT} characters.`
                        : `${bio.length}/${BIO_LIMIT}`}
                    </p>
                  )}
                </div>

                {saveProfile.isError && (
                  <ErrorStrip
                    heading={errorHeading((saveProfile.error as ApiError)?.code)}
                    body={
                      (saveProfile.error as Error)?.message ||
                      'Nothing was saved. Check your connection and try again.'
                    }
                  />
                )}
              </div>

              <div className="mt-6 flex items-start justify-end gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={cancelEdit}
                  disabled={saveProfile.isPending}
                >
                  Cancel
                </Button>
                {/* Save is never pre-disabled on a client-side guess of a
                    server rule. Every rule on this page lives on the server by
                    design, and a second, weaker copy of it would leave the user
                    facing a grey button with no explanation the first time the
                    two disagreed. */}
                {lostAccess ? (
                  <LockedControl
                    label="Save changes"
                    variant="primary"
                    size="md"
                    className="text-right"
                    reason="Your access to this organisation changed. Copy anything you need — this won't save."
                  />
                ) : (
                  <Button
                    type="button"
                    onClick={submitProfile}
                    disabled={saveProfile.isPending}
                    aria-busy={saveProfile.isPending || undefined}
                  >
                    {saveProfile.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                )}
              </div>
            </>
          ) : org.bio ? (
            <p className="max-w-prose whitespace-pre-line text-body text-offwhite">{org.bio}</p>
          ) : (
            <p className="text-caption text-graytext-mid">{org.name} hasn't written a bio yet.</p>
          )}
        </Card>

        {/* Links card mounts here (04-08). */}

        {/* Brand kit card mounts here (04-09) — rendered iff `canEdit`, with
            its own separately-gated query. */}
      </div>

      <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)} title="Remove the logo?">
        <p className="text-body text-graytext-light">
          {org.name} goes back to {afterRemoval}. You can upload a new one any time.
        </p>
        {removeLogo.isError && (
          <div className="mt-4">
            <ErrorStrip
              heading={errorHeading((removeLogo.error as ApiError)?.code)}
              body={(removeLogo.error as Error)?.message}
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            autoFocus
            onClick={() => setRemoveOpen(false)}
            disabled={removeLogo.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            type="button"
            onClick={confirmRemove}
            disabled={removeLogo.isPending}
            aria-busy={removeLogo.isPending || undefined}
          >
            {removeLogo.isPending ? 'Removing…' : 'Remove logo'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

/* Render-locked is a specific visual contract, not a bare `disabled`: the
 * label is unchanged, a padlock marks it, and the condition is stated in a
 * *visible* line as well as the title, because a tooltip alone is unreachable
 * on touch. It stays hoverable and focusable — pointer events are never
 * switched off, because an explanation nobody can hover is not an explanation.
 * Busy is the opposite contract and lives inline on each control: aria-busy,
 * no padlock, and the verb in its present-participle form. */
function LockedControl({
  label,
  reason,
  variant = 'secondary',
  size = 'sm',
  className,
}: {
  label: string
  reason: string
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
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

function ErrorStrip({ heading, body }: { heading: string; body?: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-[14px] text-red-300"
    >
      <div className="font-semibold">{heading}</div>
      {body && <div className="mt-1">{body}</div>}
    </div>
  )
}
