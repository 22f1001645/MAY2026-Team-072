import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../lib/api'
import {
  useCapabilities,
  useOrgProfile,
  useReplaceSocialLinks,
  useUpdateOrgProfile,
  useUploadOrgLogo,
} from '../lib/queries'
import { Badge, Button, Card, Dialog, SectionTitle, Select, Textarea, useToast } from '../components/ui'
import { ErrorState, Loading } from '../components/states'
import { OrgLogo, resolveRung } from '../components/OrgLogo'
import { BrandKitEditor } from '../components/BrandKitEditor'
import { SocialLinksEditor } from '../components/SocialLinksEditor'
import { SocialLinksRow } from '../components/SocialLinksRow'
import { cx } from '../lib/format'

const ORG_TYPE_LABEL: Record<string, string> = {
  house: 'Forest House',
  society: 'Society',
  region: 'Region',
  council: 'Council',
}

const BIO_LIMIT = 1000
const BIO_COUNTER_FROM = 800
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const LOGO_LIMIT_BYTES = 2 * 1024 * 1024

const NO_ORGS: string[] = []

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

  const [activeTab, setActiveTab] = useState<'public' | 'internal'>('public')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTab, setEditTab] = useState<'identity' | 'links'>('identity')

  const [bio, setBio] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [logoNotice, setLogoNotice] = useState<{ heading: string; body?: string } | null>(null)
  const [logoLoadFailed, setLogoLoadFailed] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [kitDirty, setKitDirty] = useState(false)

  const saveProfile = useUpdateOrgProfile()
  const removeLogo = useUpdateOrgProfile()
  const uploadLogo = useUploadOrgLogo()
  const saveLinks = useReplaceSocialLinks()

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

  const dirty = (editModalOpen && editTab === 'identity' && bio !== (org?.bio ?? '')) || kitDirty

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

  const liveRung = resolveRung(org)
  const fallbackRung = resolveRung(org, 2)
  const fallbackNote =
    liveRung === 1
      ? null
      : liveRung <= 3
        ? `Using the built-in ${org.name} mark`
        : `No logo yet. ${org.name} shows its initials.`
  const afterRemoval = fallbackRung <= 3 ? `the built-in ${org.name} mark` : 'its initials'

  const lostAccess = editModalOpen && !canEdit

  const startEdit = () => {
    setBio(org.bio ?? '')
    setLogoNotice(null)
    setEditTab('identity')
    setEditModalOpen(true)
  }

  const cancelEdit = () => {
    setEditModalOpen(false)
    setLogoNotice(null)
  }

  const hasLinks = org.socialLinks.length > 0 || !!org.website
  const needsAttention = org.withheldPlatforms.length

  const submitProfile = () => {
    saveProfile.mutate(
      { id: orgId, payload: { bio } },
      {
        onSuccess: (data) => {
          qc.setQueryData(['orgProfile', orgId], data)
          addToast('Profile saved', 'success')
          setEditModalOpen(false)
        },
      },
    )
  }

  const submitLinks = (payload: {
    links: { platform: string; url: string }[]
    website: string
  }) => {
    saveLinks.mutate(
      { id: orgId, payload },
      {
        onSuccess: (data) => {
          qc.setQueryData(['orgProfile', orgId], data)
          addToast('Links saved', 'success')
          setEditModalOpen(false)
        },
      },
    )
  }

  const chooseFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLogoNotice(null)
    setLogoLoadFailed(false)

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

  // Gradient based on Brand Kit Palette or fallback
  const p1 = org.brandKit?.palette?.[0] || 'rgba(63, 212, 182, 0.2)'
  const p2 = org.brandKit?.palette?.[1] || 'rgba(16, 185, 129, 0.1)'
  const bannerStyle = { background: `linear-gradient(135deg, ${p1}, ${p2})` }

  return (
    <div className="pb-16 animate-fade-in">
      {/* Dynamic Banner & Avatar */}
      <div className="relative mb-24 h-48 w-full overflow-visible rounded-xl border border-white/5 md:h-64" style={bannerStyle}>
        {/* Holographic overlay */}
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        
        {showSwitcher && (
          <div className="absolute top-4 left-4 z-10">
            <Select
              className="w-48 bg-black/50 backdrop-blur-md border-white/10"
              value={orgId}
              onChange={(e) => navigate(`/orgs/${e.target.value}`)}
              options={switcherOptions}
            />
          </div>
        )}

        {/* Global Edit Button */}
        {canEdit && (
          <div className="absolute right-4 bottom-4 md:top-4 md:bottom-auto">
            <Button variant="secondary" onClick={startEdit} className="bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10">
              Edit Profile
            </Button>
          </div>
        )}

        {/* Overlapping Avatar */}
        <div className="absolute bottom-[-80px] left-6 md:left-10 rounded-full border-[6px] border-[#0a0a0a] bg-[#0a0a0a] shadow-xl">
          <OrgLogo
            org={org}
            size={160}
            className="rounded-full"
            onLogoLoadError={() => setLogoLoadFailed(true)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-[300px_1fr]">
        {/* Left Sidebar */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">{org.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{ORG_TYPE_LABEL[org.type] ?? org.type}</Badge>
              {org.city && <Badge tone="neutral">{org.city}</Badge>}
            </div>
          </div>

          <div className="text-body text-offwhite whitespace-pre-line">
            {org.bio ? (
              org.bio
            ) : (
              <span className="text-graytext-mid text-sm italic">{org.name} hasn't written a bio yet.</span>
            )}
          </div>

          {(canEdit || hasLinks) && (
            <div className="mt-2 border-t border-white/5 pt-6">
              {hasLinks ? (
                <SocialLinksRow links={org.socialLinks} website={org.website} />
              ) : (
                <p className="text-caption text-graytext-mid">No links yet.</p>
              )}
              {canEdit && needsAttention > 0 && (
                <div className="mt-3">
                  <Badge tone="warn">
                    {needsAttention === 1 ? '1 link needs attention' : `${needsAttention} links need attention`}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content (Tabs) */}
        <div className="flex flex-col min-h-[400px]">
          <div className="mb-6 flex items-center gap-6 border-b border-white/5 pb-px">
            <button
              className={cx(
                "pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative",
                activeTab === 'public' ? "text-teal" : "text-graytext-mid hover:text-white"
              )}
              onClick={() => setActiveTab('public')}
            >
              Public Profile
              {activeTab === 'public' && (
                <span className="absolute bottom-[-1px] left-0 h-[2px] w-full bg-teal shadow-[0_0_8px_rgba(63,212,182,0.8)]" />
              )}
            </button>
            {canEdit && (
              <button
                className={cx(
                  "pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative flex items-center gap-2",
                  activeTab === 'internal' ? "text-amber-400" : "text-graytext-mid hover:text-white"
                )}
                onClick={() => setActiveTab('internal')}
              >
                Manager Internal
                {needsAttention > 0 && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />}
                {activeTab === 'internal' && (
                  <span className="absolute bottom-[-1px] left-0 h-[2px] w-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                )}
              </button>
            )}
          </div>

          <div className="flex-1 animate-fade-up">
            {activeTab === 'public' ? (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-graytext-mid">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                </div>
                <h3 className="text-lg font-semibold text-white">More features coming soon</h3>
                <p className="mt-2 text-sm text-graytext-light max-w-sm mx-auto">
                  Featured projects, active members, and public updates will appear here in the future.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 border-amber-500/20 bg-amber-500/[0.02]">
                  <h3 className="text-h4 font-bold text-amber-400 mb-2 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                    Internal Dashboard
                  </h3>
                  <p className="text-sm text-graytext-light mb-6">
                    Everything below is strictly visible to managers of {org.name}.
                  </p>
                  <BrandKitEditor
                    orgId={orgId}
                    canEdit={canEdit}
                    editing={true}
                    blockedBy={null}
                    onEdit={() => {}}
                    onCancel={() => {}}
                    onDirtyChange={setKitDirty}
                  />
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Edit Modal */}
      <Dialog open={editModalOpen} onClose={cancelEdit} title="Edit Profile" className="max-w-2xl">
        <div className="mb-6 flex border-b border-white/10">
          <button
            className={cx("px-4 py-3 text-[13px] font-bold uppercase tracking-wider", editTab === 'identity' ? "text-teal border-b-2 border-teal" : "text-graytext-mid hover:text-white")}
            onClick={() => setEditTab('identity')}
          >
            Identity & Bio
          </button>
          <button
            className={cx("px-4 py-3 text-[13px] font-bold uppercase tracking-wider", editTab === 'links' ? "text-teal border-b-2 border-teal" : "text-graytext-mid hover:text-white")}
            onClick={() => setEditTab('links')}
          >
            Social Links
            {needsAttention > 0 && <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-400">{needsAttention}</span>}
          </button>
        </div>

        <div className="min-h-[300px]">
          {editTab === 'identity' ? (
            <div className="space-y-8">
              <div>
                <label className="mb-3 block text-caption font-semibold uppercase tracking-wider text-graytext-light">
                  Logo
                </label>
                <div className="flex items-center gap-4">
                  {tile}
                  <div className="flex flex-col gap-2">
                    <label
                      aria-busy={uploadLogo.isPending || undefined}
                      className={cx(
                        'inline-flex cursor-pointer items-center justify-center rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10',
                        uploadLogo.isPending && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploadLogo.isPending} onChange={chooseFile} />
                      {uploadLogo.isPending ? 'Uploading…' : liveRung === 1 ? 'Replace image' : 'Upload image'}
                    </label>
                    {liveRung === 1 && (
                      <button
                        type="button"
                        onClick={() => setRemoveOpen(true)}
                        className="text-left text-sm text-red-400 hover:text-red-300 transition"
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
                {fallbackNote && <p className="mt-3 text-caption text-graytext-light">{fallbackNote}</p>}
                {logoLoadFailed && <p className="mt-2 text-caption text-amber-300">That logo file couldn't be loaded. Upload it again.</p>}
                {logoNotice && <div className="mt-3"><ErrorStrip heading={logoNotice.heading} body={logoNotice.body} /></div>}
              </div>

              <div>
                <label htmlFor="org-bio" className="mb-2 block text-caption font-semibold uppercase tracking-wider text-graytext-light">
                  Bio
                </label>
                <Textarea id="org-bio" rows={5} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What your organisation is, who it's for, and what it's known for." />
                {bio.length >= BIO_COUNTER_FROM && (
                  <p className={cx('mt-1 text-caption', bio.length > BIO_LIMIT ? 'text-red-300' : 'text-graytext-mid')}>
                    {bio.length > BIO_LIMIT ? `${bio.length}/${BIO_LIMIT} — trim ${bio.length - BIO_LIMIT} characters.` : `${bio.length}/${BIO_LIMIT}`}
                  </p>
                )}
              </div>

              {saveProfile.isError && (
                <ErrorStrip heading={errorHeading((saveProfile.error as ApiError)?.code)} body={(saveProfile.error as Error)?.message || 'Nothing was saved. Check your connection and try again.'} />
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button variant="ghost" onClick={cancelEdit} disabled={saveProfile.isPending}>Cancel</Button>
                {lostAccess ? (
                  <LockedControl label="Save changes" reason="Your access changed. Copy anything you need — this won't save." />
                ) : (
                  <Button onClick={submitProfile} disabled={saveProfile.isPending} aria-busy={saveProfile.isPending || undefined}>
                    {saveProfile.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <SocialLinksEditor
              org={org}
              saving={saveLinks.isPending}
              error={saveLinks.isError ? (saveLinks.error as ApiError) : null}
              onSave={submitLinks}
              onCancel={cancelEdit}
            />
          )}
        </div>
      </Dialog>

      <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)} title="Remove the logo?">
        <p className="text-body text-graytext-light">
          {org.name} goes back to {afterRemoval}. You can upload a new one any time.
        </p>
        {removeLogo.isError && (
          <div className="mt-4"><ErrorStrip heading={errorHeading((removeLogo.error as ApiError)?.code)} body={(removeLogo.error as Error)?.message} /></div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" type="button" autoFocus onClick={() => setRemoveOpen(false)} disabled={removeLogo.isPending}>Cancel</Button>
          <Button variant="danger" type="button" onClick={confirmRemove} disabled={removeLogo.isPending} aria-busy={removeLogo.isPending || undefined}>
            {removeLogo.isPending ? 'Removing…' : 'Remove logo'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

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
      <Button variant={variant} size={size} disabled aria-disabled="true" title={reason} className="cursor-not-allowed opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
    <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-[14px] text-red-300">
      <div className="font-semibold">{heading}</div>
      {body && <div className="mt-1">{body}</div>}
    </div>
  )
}
