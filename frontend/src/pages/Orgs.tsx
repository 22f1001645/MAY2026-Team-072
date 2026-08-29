import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCities, useOrgs, usePors, useUsers, useCreateOrg, useAssignPor, useDeactivatePor, useAdminOverrideAcademicStatus } from '../lib/queries'
import { api } from '../lib/api'
import { Badge, Button, Card, Input, SectionTitle, useToast, Dialog, Select, Textarea } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx, safeExternalHref } from '../lib/format'
import { IndiaMap } from '../components/IndiaMap'
import { OrgLogo } from '../components/OrgLogo'
import { BulkAssignModal } from '../components/BulkAssignModal'

const ORG_TONE: Record<string, any> = {
  house: 'gold',
  society: 'teal',
  region: 'teal',
  council: 'warn',
}

// Four broad domains societies are grouped/filtered by (Societies & Councils
// tab). Coarser than a free-text tagline on purpose — the domain drives
// filtering, section grouping and badge colour, so it stays a short closed set.
export const SOCIETY_CATEGORIES = [
  { label: 'Technical', value: 'Technical' },
  { label: 'Cultural', value: 'Cultural' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Impact', value: 'Impact' },
]

const DOMAIN_TONE: Record<string, 'teal' | 'gold' | 'success' | 'danger'> = {
  Technical: 'teal',
  Cultural: 'gold',
  Sports: 'success',
  Impact: 'danger',
}

function DomainIcon({ domain, className }: { domain: string; className?: string }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className }
  switch (domain) {
    case 'Technical':
      return <svg {...common}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
    case 'Cultural':
      return <svg {...common}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
    case 'Sports':
      return <svg {...common}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a1 1 0 0 0-1 1 4 4 0 0 0 4 4M17 6h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4" /></svg>
    default:
      return <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
  }
}

// 12 Forest Houses with national park metadata.
//
// Exported, not deleted (04-07 P-04). From Phase 4 it is the data behind rungs
// 2 and 3 of `components/OrgLogo.tsx`'s fallback ladder, and `OrgLogo` is the
// only component that reads it. Twelve seeded Houses have visual identity that
// exists nowhere else — an upload wins, but nothing here is thrown away.
export const HOUSE_META: Record<string, { color: string; logo: string; imageLogo?: string; website?: string }> = {
  'Bandipur House': { color: '#4ade80', logo: '🐘', imageLogo: '/houses/bandipur.png', website: 'https://bandipur.iitmbs.org/' },
  'Corbett House': { color: '#60a5fa', logo: '🐅', imageLogo: '/houses/corbett.png', website: 'https://corbett.iitmbs.org/' },
  'Gir House': { color: '#f59e0b', logo: '🦁', imageLogo: '/houses/gir.png', website: 'https://sites.google.com/student.onlinedegree.iitm.ac.in/gir-house' },
  'Kanha House': { color: '#a78bfa', logo: '🦌', imageLogo: '/houses/kanha.png', website: 'https://kanha.iitmbs.org/' },
  'Kaziranga House': { color: '#34d399', logo: '🦏', imageLogo: '/houses/kaziranga.png', website: 'https://kaziranga.iitmbs.org/' },
  'Nallamala House': { color: '#f97316', logo: '🐆', imageLogo: '/houses/nallamala.png', website: 'https://nallamala.iitmbs.org/' },
  'Namdapha House': { color: '#06b6d4', logo: '🦅', imageLogo: '/houses/namdapha.png', website: 'https://namdapha.iitmbs.org/' },
  'Nilgiri House': { color: '#5CE6C9', logo: '⛰️', imageLogo: '/houses/nilgiri.png', website: 'https://nilgiri.iitmbs.org/' },
  'Pichavaram House': { color: '#e879f9', logo: '🛶', imageLogo: '/houses/pichavaram.png', website: 'https://pichavaram.iitmbs.org/' },
  'Saranda House': { color: '#fb923c', logo: '🌳', imageLogo: '/houses/saranda.png', website: 'https://saranda.iitmbs.org/' },
  'Sundarbans House': { color: '#2dd4bf', logo: '🐊', imageLogo: '/houses/sundarbans.png', website: 'https://sundarbans.iitmbs.org/#/' },
  'Wayanad House': { color: '#a3e635', logo: '🐒', imageLogo: '/houses/wayanad.png', website: 'https://wayanad.iitmbs.org/' },
}

const HOUSE_POR_TYPES = [
  'House Secretary',
  'Deputy House Secretary',
  'Regional Coordinator',
  'Web Admin',
]

const SOCIETY_POR_TYPES = [
  'Society Secretary',
  'Society Deputy Secretary',
]

const ALL_POR_TYPES = [
  ...HOUSE_POR_TYPES,
  ...SOCIETY_POR_TYPES,
]

export default function Orgs() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const [tab, setTab] = useState<'houses' | 'orgs' | 'pors' | 'cities' | 'members' | 'brand-kits'>('houses')
  const [councilTab, setCouncilTab] = useState<'upper' | 'lower'>('upper')

  const [userSearch, setUserSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')

  const [showSeedModal, setShowSeedModal] = useState(false)
  const [showPorModal, setShowPorModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [viewingHouseId, setViewingHouseId] = useState<string | null>(null)
  const [selectedMapRegionId, setSelectedMapRegionId] = useState<string | null>(null)

  // Add Society form state
  const [societyName, setSocietyName] = useState('')
  const [societyCategory, setSocietyCategory] = useState('Tech')
  const [customCategories, setCustomCategories] = useState<{ label: string; value: string }[]>([])
  const [categoryQuery, setCategoryQuery] = useState('')
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  const [societyTagline, setSocietyTagline] = useState('')
  const [societyDescription, setSocietyDescription] = useState('')
  const [societyWebsite, setSocietyWebsite] = useState('')
  const [societyInstagram, setSocietyInstagram] = useState('')
  const [societyLinkedin, setSocietyLinkedin] = useState('')
  const [societyX, setSocietyX] = useState('')
  const [societyLogoFile, setSocietyLogoFile] = useState<File | null>(null)
  const [societyLogoPreview, setSocietyLogoPreview] = useState<string | null>(null)
  const [societyBannerFile, setSocietyBannerFile] = useState<File | null>(null)
  const [societyBannerPreview, setSocietyBannerPreview] = useState<string | null>(null)
  const [societyFormError, setSocietyFormError] = useState<string | null>(null)

  // Assign POR form state
  const [userId, setUserId] = useState('')
  const [porTargetType, setPorTargetType] = useState<'house' | 'society'>('house')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedPorType, setSelectedPorType] = useState(HOUSE_POR_TYPES[0])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [porTerm, setPorTerm] = useState('May 2026')
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  // Add City to Region state
  const [showAddCityModal, setShowAddCityModal] = useState(false)
  const [addCityRegionId, setAddCityRegionId] = useState('')
  const [addCityRegionName, setAddCityRegionName] = useState('')
  const [newCityName, setNewCityName] = useState('')
  const [addCityError, setAddCityError] = useState<string | null>(null)

  // POR Directory search & deactivate state
  const [porSearch, setPorSearch] = useState('')
  const [porOrgFilter, setPorOrgFilter] = useState('')
  const [porRoleFilter, setPorRoleFilter] = useState('')
  const [porStatusFilter, setPorStatusFilter] = useState('')
  const [porRegionFilter, setPorRegionFilter] = useState('')
  const [societyDomainFilter, setSocietyDomainFilter] = useState('all')
  const [societyViewMode, setSocietyViewMode] = useState<'grid' | 'list'>('grid')
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)

  // Members / Academic Status state
  const [overrideUser, setOverrideUser] = useState<any>(null)
  const [overrideLevel, setOverrideLevel] = useState('foundation')
  const [overrideStatus, setOverrideStatus] = useState('active')
  const [overrideReason, setOverrideReason] = useState('')

  const { data: orgs = [], isLoading: lo, isError: eo, error: erro } = useOrgs()
  const { data: cities = [] } = useCities()
  const { data: pors = [] } = usePors()
  const { data: users = [] } = useUsers(userSearch.trim(), showPorModal && userSearch.trim().length > 0)
  const { data: memberSearchResults = [], isFetching: isSearchingMembers } = useUsers(
    memberSearch.trim(),
    tab === 'members' && memberSearch.trim().length > 0
  )
  const houses = useMemo(() => orgs.filter((o: any) => o.type === 'house'), [orgs])
  const societies = useMemo(() => orgs.filter((o: any) => o.type === 'society'), [orgs])
  const SOCIETY_DOMAIN_ORDER = ['Technical', 'Cultural', 'Sports', 'Impact']
  const societyDomainGroups = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const s of societies) {
      const key = s.category || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      const ia = SOCIETY_DOMAIN_ORDER.indexOf(a)
      const ib = SOCIETY_DOMAIN_ORDER.indexOf(b)
      if (ia === -1 && ib === -1) return a.localeCompare(b)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })
    return keys.map(key => ({ domain: key, items: map.get(key)! }))
  }, [societies])
  const visibleSocietyDomainGroups = useMemo(
    () => societyDomainGroups.filter(g => societyDomainFilter === 'all' || g.domain === societyDomainFilter),
    [societyDomainGroups, societyDomainFilter],
  )
  const regions = useMemo(() => orgs.filter((o: any) => o.type === 'region'), [orgs])

  const createOrgMutation = useCreateOrg()
  const assignPorMutation = useAssignPor()
  const deactivatePorMutation = useDeactivatePor()
  const overrideMutation = useAdminOverrideAcademicStatus()

  const isRC = selectedPorType === 'Regional Coordinator'
  const upperCouncil = pors.filter((p: any) => p.council_tier === 'upper_house_council' && p.active)
  const lowerCouncil = pors.filter((p: any) => p.council_tier === 'lower_house_council' && p.active)
  const confirmPor = pors.find((p: any) => p.id === confirmDeactivateId)

  const addCityMutation = useMutation({
    mutationFn: ({ regionId, name }: { regionId: string; name: string }) =>
      api.addCityToRegion(regionId, name),
    onSuccess: (_d, { regionId }) => {
      qc.invalidateQueries({ queryKey: ['cities-for-region', regionId] })
      qc.invalidateQueries({ queryKey: ['cities'] })
      setShowAddCityModal(false)
      setNewCityName('')
      setAddCityError(null)
    },
    onError: (err: any) => setAddCityError(err.message || 'Failed to add city.'),
  })

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault()
    setAddCityError(null)
    if (!newCityName.trim()) return
    addCityMutation.mutate({ regionId: addCityRegionId, name: newCityName.trim() })
  }

  const resetSocietyForm = () => {
    setSocietyName('')
    setSocietyCategory('Tech')
    setCategoryQuery('')
    setCategoryDropdownOpen(false)
    setSocietyTagline('')
    setSocietyDescription('')
    setSocietyWebsite('')
    setSocietyInstagram('')
    setSocietyLinkedin('')
    setSocietyX('')
    setSocietyLogoFile(null)
    setSocietyLogoPreview(null)
    setSocietyBannerFile(null)
    setSocietyBannerPreview(null)
    setSocietyFormError(null)
    setShowSeedModal(false)
  }

  useEffect(() => {
    if (!categoryDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [categoryDropdownOpen])

  const allCategories = useMemo(() => {
    const map = new Map<string, { label: string; value: string }>()
    SOCIETY_CATEGORIES.forEach(c => map.set(c.value.toLowerCase(), c))
    orgs.forEach((o: any) => {
      if (o.category && !map.has(o.category.toLowerCase())) {
        map.set(o.category.toLowerCase(), { label: o.category, value: o.category })
      }
    })
    customCategories.forEach(c => map.set(c.value.toLowerCase(), c))
    return Array.from(map.values())
  }, [orgs, customCategories])

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase()
    if (!q) return allCategories
    return allCategories.filter(c => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q))
  }, [allCategories, categoryQuery])

  const selectedCategoryObj = allCategories.find(c => c.value.toLowerCase() === (societyCategory || '').toLowerCase())

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setSocietyFormError("Logo must be a PNG, JPEG, or WebP image.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setSocietyFormError("Logo must be 2 MB or smaller.")
      return
    }
    setSocietyFormError(null)
    setSocietyLogoFile(file)
    setSocietyLogoPreview(URL.createObjectURL(file))
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setSocietyFormError("Banner must be a PNG, JPEG, or WebP image.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setSocietyFormError("Banner must be 5 MB or smaller.")
      return
    }
    setSocietyFormError(null)
    setSocietyBannerFile(file)
    setSocietyBannerPreview(URL.createObjectURL(file))
  }

  const handleCreateSociety = (e: React.FormEvent) => {
    e.preventDefault()
    setSocietyFormError(null)
    const name = societyName.trim()
    if (!name) {
      setSocietyFormError('Society Name is required.')
      return
    }

    const formData = new FormData()
    formData.append('name', name)
    formData.append('type', 'society')
    formData.append('category', societyCategory)
    if (societyTagline.trim()) formData.append('tagline', societyTagline.trim())
    if (societyDescription.trim()) formData.append('description', societyDescription.trim())
    if (societyWebsite.trim()) formData.append('website', societyWebsite.trim())
    if (societyInstagram.trim()) formData.append('instagram', societyInstagram.trim())
    if (societyLinkedin.trim()) formData.append('linkedin', societyLinkedin.trim())
    if (societyX.trim()) formData.append('x', societyX.trim())
    if (societyLogoFile) formData.append('logo', societyLogoFile)
    if (societyBannerFile) formData.append('banner', societyBannerFile)

    createOrgMutation.mutate(formData, {
      onSuccess: () => {
        resetSocietyForm()
        addToast(`Society "${name}" created successfully!`)
      },
      onError: (err: any) => {
        setSocietyFormError(err.message || 'Failed to create society.')
      },
    })
  }

  const handleAssignPor = (e: React.FormEvent) => {
    e.preventDefault()
    setAssignmentError(null)
    if (!userId.trim() || !selectedOrgId) return

    assignPorMutation.mutate(
      {
        orgId: selectedOrgId,
        user_id: userId.trim(),
        por_type: selectedPorType,
        term: porTerm,
        region_id: isRC ? selectedRegion || undefined : undefined,
      },
      {
        onSuccess: () => {
          setShowPorModal(false)
          setUserId('')
          setUserSearch('')
          setSelectedOrgId('')
          setAssignmentError(null)
          addToast('Role authorized successfully!')
        },
        onError: (err: any) => {
          setAssignmentError(err.message || 'Failed to assign POR position.')
        },
      },
    )
  }

  if (lo) return <Loading label="Loading organisations…" />
  if (eo) return <ErrorState error={erro} />

  const filteredOrgs = orgs.filter((o: any) => o.type !== 'house' && o.type !== 'region')

  const tabs = [
    ['houses', `12 Forest Houses`],
    ['orgs', `Societies & Councils (${filteredOrgs.length})`],
    ['cities', `Regions & Cities`],
    ['pors', `POR Directory (${pors.length})`],
    ['members', `Members`],
    ['brand-kits', `Brand Kits`],
  ] as const

  const selectedUserObj = users.find((u: any) => u.id === userId || u.email === userId)

  const renderSocietyPORChips = (o: any) => {
    const secretary = pors.find((p: any) => p.org_id === o.id && p.por_type === 'Society Secretary' && p.active)
    const deputy = pors.find((p: any) => p.org_id === o.id && p.por_type === 'Society Deputy Secretary' && p.active)
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {secretary ? (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-300 font-medium">
            <span className="text-[10px] text-emerald-400/70 uppercase">Sec:</span> {secretary.member}
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPorTargetType('society')
              setSelectedPorType('Society Secretary')
              setSelectedOrgId(o.id)
              setShowPorModal(true)
            }}
            className="inline-flex items-center gap-0.5 rounded border border-dashed border-white/15 px-1.5 py-0.5 text-graytext-mid hover:border-teal/40 hover:text-teal transition-colors"
          >
            + Secretary
          </button>
        )}
        {deputy ? (
          <span className="inline-flex items-center gap-1 rounded bg-teal/10 border border-teal/20 px-2 py-0.5 text-teal font-medium">
            <span className="text-[10px] text-teal/70 uppercase">Dep:</span> {deputy.member}
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPorTargetType('society')
              setSelectedPorType('Society Deputy Secretary')
              setSelectedOrgId(o.id)
              setShowPorModal(true)
            }}
            className="inline-flex items-center gap-0.5 rounded border border-dashed border-white/15 px-1.5 py-0.5 text-graytext-mid hover:border-teal/40 hover:text-teal transition-colors"
          >
            + Deputy
          </button>
        )}
      </div>
    )
  }

  const renderSocietyCard = (o: any) => (
    <Card
      key={o.id}
      hover
      className="group overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-teal/30 cursor-pointer p-0"
      onClick={() => navigate(`/orgs/${o.id}`)}
    >
      {o.bannerUrl ? (
        <div className="h-24 w-full overflow-hidden border-b border-white/5 bg-onyx relative">
          <img
            src={o.bannerUrl}
            alt={o.name}
            className="h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/40 to-transparent" />
        </div>
      ) : (
        <div className="h-2 w-full bg-gradient-to-r from-teal/40 via-teal to-gold/40" />
      )}

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <OrgLogo org={o} size={40} />
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-offwhite group-hover:text-teal transition-colors truncate">
                {o.name}
              </div>
            </div>
          </div>
          {o.category && <Badge tone={DOMAIN_TONE[o.category] || 'teal'}>{o.category}</Badge>}
        </div>

        {o.tagline && (
          <p className="mb-2 text-[13px] text-graytext-light font-medium italic line-clamp-1">
            "{o.tagline}"
          </p>
        )}

        {o.description && (
          <p className="text-caption text-graytext-mid line-clamp-2 mt-auto">
            {o.description}
          </p>
        )}

        <div className="mt-3 border-t border-white/5 pt-2.5">
          {renderSocietyPORChips(o)}
        </div>

        <div className="mt-3 flex items-center justify-end border-t border-white/5 pt-2.5 text-[12px] text-graytext-mid">
          <span className="text-teal group-hover:underline flex items-center gap-1 font-medium">
            View profile →
          </span>
        </div>
      </div>
    </Card>
  )

  const renderSocietyListRow = (o: any) => (
    <div
      key={o.id}
      onClick={() => navigate(`/orgs/${o.id}`)}
      className="group flex flex-wrap items-center gap-4 border-b border-white/5 px-4 py-3.5 last:border-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
    >
      <OrgLogo org={o} size={40} />
      <div className="min-w-[180px] flex-1">
        <div className="text-[14px] font-bold text-offwhite group-hover:text-teal transition-colors">{o.name}</div>
        {o.tagline && <div className="text-caption text-graytext-mid italic truncate">"{o.tagline}"</div>}
      </div>
      {o.category && <Badge tone={DOMAIN_TONE[o.category] || 'teal'}>{o.category}</Badge>}
      <div className="hidden sm:block">{renderSocietyPORChips(o)}</div>
      <span className="ml-auto text-teal group-hover:underline flex items-center gap-1 text-[12px] font-medium shrink-0">
        View profile →
      </span>
    </div>
  )

  return (
    <div>
      <SectionTitle
        eyebrow="Admin"
        title="Orgs, PORs & Cities"
        sub="Manage Forest Houses, Regions, Societies, and the POR Directory. Permissions follow PORs."
        right={
          <div className="flex gap-3">
            <Button size="sm" onClick={() => setShowBulkModal(true)}>+ Bulk Assign</Button>
            <Button size="sm" onClick={() => setShowPorModal(true)}>+ Authorize Role</Button>
          </div>
        }
      />

      {/* Tab Bar */}
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-white/8">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={cx(
              'relative whitespace-nowrap px-4 py-2.5 text-[14px] font-semibold transition-colors',
              tab === k ? 'text-teal' : 'text-graytext-mid hover:text-offwhite',
            )}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal" />}
          </button>
        ))}
      </div>

      {/* ---- 12 FOREST HOUSES TAB ---- */}
      {tab === 'houses' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-caption text-graytext-mid">
              House allocation is non-geographical — students from every region belong to each house.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {houses.map((h: any) => {
              const secretary = pors.find((p: any) => p.org === h.name && p.por_type === 'House Secretary' && p.active)
              const deputy = pors.find((p: any) => p.org === h.name && p.por_type === 'Deputy House Secretary' && p.active)
              const rcs = pors.filter((p: any) => p.org === h.name && p.por_type === 'Regional Coordinator' && p.active)
              return (
                <Card key={h.id} hover className="p-5" onClick={() => setViewingHouseId(h.id)}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <OrgLogo org={h} size={40} />
                  </div>
                  <div className="text-[15px] font-bold text-offwhite">{h.name}</div>
                  <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-graytext-mid">Secretary</span>
                      <span className={secretary ? 'text-emerald-300' : 'text-graytext-mid'}>
                        {secretary ? secretary.member : 'Vacant'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-graytext-mid">Deputy</span>
                      <span className={deputy ? 'text-emerald-300' : 'text-graytext-mid'}>
                        {deputy ? deputy.member : 'Vacant'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-graytext-mid">RCs</span>
                      <span className="text-teal">{rcs.length} / 10</span>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- POR DIRECTORY TAB ---- */}
      {tab === 'pors' && (
        <div>
          {/* Search + Filter bar */}
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              placeholder="Search by member name…"
              value={porSearch}
              onChange={e => setPorSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={porOrgFilter} onChange={e => setPorOrgFilter(e.target.value)} options={[{ label: 'All Houses / Orgs', value: '' }, ...Array.from(new Set(pors.map((p: any) => p.org))).sort().map((org: any) => ({ label: org, value: org }))]} />
            <Select value={porRoleFilter} onChange={e => setPorRoleFilter(e.target.value)} options={[{ label: 'All Positions', value: '' }, ...Array.from(new Set(pors.map((p: any) => p.por_type))).sort().map((role: any) => ({ label: role, value: role }))]} />
            <Select value={porRegionFilter} onChange={e => setPorRegionFilter(e.target.value)} options={[{ label: 'All Regions', value: '' }, ...Array.from(new Set(pors.map((p: any) => p.region).filter(Boolean))).sort().map((region: any) => ({ label: region, value: region }))]} />
            <Select value={porStatusFilter} onChange={e => setPorStatusFilter(e.target.value)} options={[{ label: 'All Statuses', value: '' }, { label: 'Active Only', value: 'active' }, { label: 'Past Only', value: 'past' }]} />
          </div>
          {pors.length === 0 ? (
            <Card className="p-10 text-center text-graytext-light">No PORs assigned yet.</Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                    <th className="px-5 py-3 text-left">Member</th>
                    <th className="px-5 py-3 text-left">House / Org</th>
                    <th className="px-5 py-3 text-left">Position</th>
                    <th className="px-5 py-3 text-left">Region</th>
                    <th className="px-5 py-3 text-left">Council</th>
                    <th className="px-5 py-3 text-left">Term</th>
                    <th className="px-5 py-3 text-right">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pors
                    .filter((p: any) => {
                      const matchName = !porSearch || (p.member ?? '').toLowerCase().includes(porSearch.toLowerCase())
                      const matchOrg = !porOrgFilter || p.org === porOrgFilter
                      const matchRole = !porRoleFilter || p.por_type === porRoleFilter
                      const matchRegion = !porRegionFilter || p.region === porRegionFilter
                      const matchStatus = !porStatusFilter || (porStatusFilter === 'active' ? p.active : !p.active)
                      return matchName && matchOrg && matchRole && matchRegion && matchStatus
                    })
                    .map((p: any) => (
                      <tr key={p.id} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-gold/12 text-[12px] font-bold text-gold">
                              {(p.member ?? '?').split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <span className="text-offwhite">{p.member ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-graytext-light">{p.org}</td>
                        <td className="px-5 py-3.5"><Badge tone="teal">{p.por_type}</Badge></td>
                        <td className="px-5 py-3.5 text-[12px] text-graytext-light">{p.region ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          {p.council_tier === 'upper_house_council' && <Badge tone="gold">Upper HC</Badge>}
                          {p.council_tier === 'lower_house_council' && <Badge tone="teal">Lower HC</Badge>}
                          {p.council_tier === 'society_core' && <Badge tone="teal">Society Core</Badge>}
                          {!p.council_tier && <span className="text-caption text-graytext-mid">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-graytext-light">{p.term}</td>
                        <td className="px-5 py-3.5 text-right">
                          {p.active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Past</Badge>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {p.active && (
                            <button
                              onClick={() => setConfirmDeactivateId(p.id)}
                              className="rounded-full border border-red-400/30 px-3 py-1 text-[12px] font-medium text-red-300 transition-colors hover:bg-red-500/10"
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>
          )}
          <p className="mt-3 text-caption text-graytext-mid">Past PORs preserved for historical record (P4).</p>
        </div>
      )}

      {/* ---- DEACTIVATE CONFIRMATION MODAL ---- */}
      {confirmDeactivateId && confirmPor && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="mb-1 text-[18px] font-bold text-offwhite">Deactivate POR?</h3>
            <p className="mb-5 text-[14px] text-graytext-light">
              This will remove <strong className="text-offwhite">{confirmPor.member}</strong>'s role as{' '}
              <strong className="text-offwhite">{confirmPor.por_type}</strong> in{' '}
              <strong className="text-offwhite">{confirmPor.org}</strong> and revoke their permissions immediately.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmDeactivateId(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={deactivatePorMutation.isPending}
                onClick={() => {
                  deactivatePorMutation.mutate(confirmDeactivateId, {
                    onSuccess: () => {
                      setConfirmDeactivateId(null)
                      addToast(`${confirmPor.por_type} role for ${confirmPor.member} deactivated.`, 'info')
                    },
                    onError: (err: any) => addToast(err.message || 'Deactivation failed.', 'error'),
                  })
                }}
              >
                {deactivatePorMutation.isPending ? 'Deactivating…' : 'Yes, Deactivate'}
              </Button>
            </div>
          </Card>
        </div>,
        document.body
      )}

      {/* ---- SOCIETIES & COUNCILS TAB ---- */}
      {tab === 'orgs' && (
        <div className="space-y-10">
          {/* ---- Societies: hero strip ---- */}
          <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h3 className="text-[20px] font-bold text-offwhite">Student Societies</h3>
                <p className="mt-1 text-[13px] text-graytext-mid">
                  Student-run bodies organised into four domains. Filter by domain or switch views to browse.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-right">
                  <div className="text-[20px] font-bold leading-none text-offwhite">{SOCIETY_DOMAIN_ORDER.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-graytext-mid">Domains</div>
                </div>
                <div className="rounded-xl border border-teal/25 bg-teal/[0.06] px-4 py-2.5 text-right">
                  <div className="text-[20px] font-bold leading-none text-teal">{societies.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-teal/70">Societies</div>
                </div>
                <button
                  onClick={() => setShowSeedModal(true)}
                  className="rounded-xl border border-teal/30 bg-teal/10 px-4 py-2.5 text-[12px] font-semibold text-teal hover:bg-teal/20 transition-colors"
                >
                  + Add Society
                </button>
              </div>
            </div>

            {/* Domain filter pills + view toggle */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-y border-white/5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSocietyDomainFilter('all')}
                  className={cx(
                    'rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors border',
                    societyDomainFilter === 'all'
                      ? 'bg-teal text-onyx border-teal'
                      : 'border-white/10 text-graytext-mid hover:border-white/25 hover:text-offwhite',
                  )}
                >
                  All Domains
                </button>
                {societyDomainGroups.map(({ domain, items }) => (
                  <button
                    key={domain}
                    onClick={() => setSocietyDomainFilter(domain)}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors border',
                      societyDomainFilter === domain
                        ? 'bg-teal text-onyx border-teal'
                        : 'border-white/10 text-graytext-mid hover:border-white/25 hover:text-offwhite',
                    )}
                  >
                    <DomainIcon domain={domain} />
                    {domain}
                    <span className={cx('opacity-70', societyDomainFilter === domain ? 'text-onyx' : 'text-graytext-mid')}>
                      ({items.length})
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 p-1">
                <button
                  onClick={() => setSocietyViewMode('grid')}
                  className={cx(
                    'rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                    societyViewMode === 'grid' ? 'bg-teal/15 text-teal' : 'text-graytext-mid hover:text-offwhite',
                  )}
                >
                  Grid
                </button>
                <button
                  onClick={() => setSocietyViewMode('list')}
                  className={cx(
                    'rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                    societyViewMode === 'list' ? 'bg-teal/15 text-teal' : 'text-graytext-mid hover:text-offwhite',
                  )}
                >
                  List
                </button>
              </div>
            </div>

            {societyViewMode === 'grid' ? (
              <div className="space-y-8">
                {visibleSocietyDomainGroups.map(({ domain, items }) => (
                  <div key={domain}>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={cx('flex h-7 w-7 items-center justify-center rounded-lg', {
                        teal: 'bg-teal/10 text-teal',
                        gold: 'bg-gold/10 text-gold',
                        success: 'bg-emerald-400/10 text-emerald-300',
                        danger: 'bg-red-400/10 text-red-300',
                      }[DOMAIN_TONE[domain] || 'teal'])}>
                        <DomainIcon domain={domain} />
                      </span>
                      <h4 className="text-[14px] font-bold text-offwhite">{domain}</h4>
                      <span className="text-[12px] text-graytext-mid">({items.length})</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((o: any) => renderSocietyCard(o))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {visibleSocietyDomainGroups.map(({ domain, items }) => (
                  <div key={domain}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cx('flex h-6 w-6 items-center justify-center rounded-md', {
                        teal: 'bg-teal/10 text-teal',
                        gold: 'bg-gold/10 text-gold',
                        success: 'bg-emerald-400/10 text-emerald-300',
                        danger: 'bg-red-400/10 text-red-300',
                      }[DOMAIN_TONE[domain] || 'teal'])}>
                        <DomainIcon domain={domain} />
                      </span>
                      <h4 className="text-[13px] font-bold text-offwhite">{domain}</h4>
                      <span className="text-[12px] text-graytext-mid">({items.length})</span>
                    </div>
                    <Card className="overflow-hidden p-0">
                      {items.map((o: any) => renderSocietyListRow(o))}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---- Councils ---- */}
          {filteredOrgs.filter((o: any) => o.type === 'council').length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-[16px] font-bold text-offwhite">
                  Councils{' '}
                  <span className="ml-1 font-normal text-graytext-mid">
                    ({filteredOrgs.filter((o: any) => o.type === 'council').length})
                  </span>
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOrgs.filter((o: any) => o.type === 'council').map((o: any) => (
                  <Card
                    key={o.id}
                    hover
                    className="group overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-teal/30 cursor-pointer p-0"
                    onClick={() => navigate(`/orgs/${o.id}`)}
                  >
                    {o.bannerUrl ? (
                      <div className="h-24 w-full overflow-hidden border-b border-white/5 bg-onyx relative">
                        <img
                          src={o.bannerUrl}
                          alt={o.name}
                          className="h-full w-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/40 to-transparent" />
                      </div>
                    ) : (
                      <div className="h-2 w-full bg-gradient-to-r from-amber-400/40 via-amber-400 to-gold/40" />
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <OrgLogo org={o} size={40} />
                          <div className="text-[15px] font-bold text-offwhite group-hover:text-teal transition-colors">
                            {o.name}
                          </div>
                        </div>
                        <Badge tone={ORG_TONE[o.type] || 'warn'}>{o.type}</Badge>
                      </div>
                      {o.tagline && (
                        <p className="mb-2 text-[13px] text-graytext-light font-medium italic line-clamp-1">"{o.tagline}"</p>
                      )}
                      {o.description && (
                        <p className="text-caption text-graytext-mid line-clamp-2 mt-auto">{o.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-end border-t border-white/5 pt-2.5 text-[12px] text-graytext-mid">
                        <span className="text-teal group-hover:underline flex items-center gap-1 font-medium">
                          View profile →
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- MEMBERS TAB ---- */}
      {tab === 'members' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-3">
            <Input
              placeholder="Search members by name or email…"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="max-w-md"
              autoFocus
            />
          </div>
          <Card className="overflow-hidden">
            {!memberSearch.trim() ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-graytext-mid">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-[15px] font-semibold text-offwhite">Search for members</div>
                <p className="mt-1 text-caption text-graytext-mid">
                  Type a name or email address above to look up student records and manage academic status.
                </p>
              </div>
            ) : isSearchingMembers ? (
              <div className="py-16 text-center text-caption text-graytext-mid">
                Searching members…
              </div>
            ) : memberSearchResults.length === 0 ? (
              <div className="py-16 text-center text-caption text-graytext-mid">
                No members found matching "{memberSearch}"
              </div>
            ) : (
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                    <th className="px-5 py-3 text-left">Member</th>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Role</th>
                    <th className="px-5 py-3 text-left">Academic Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {memberSearchResults.map((u: any) => (
                    <tr key={u.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3.5 text-offwhite font-semibold">{u.name}</td>
                      <td className="px-5 py-3.5 text-graytext-light">{u.email}</td>
                      <td className="px-5 py-3.5 capitalize text-graytext-light">{u.role}</td>
                      <td className="px-5 py-3.5">
                        <div className="text-offwhite capitalize">{u.academic_level || 'N/A'}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-[12px] text-graytext-mid capitalize">{u.academic_status || 'N/A'}</span>
                          {u.academic_confirmed_at && (
                            <Badge tone="neutral">
                              Overridden {new Date(u.academic_confirmed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button size="sm" variant="secondary" onClick={() => {
                          setOverrideUser(u)
                          setOverrideLevel(u.academic_level || 'foundation')
                          setOverrideStatus(u.academic_status || 'active')
                          setOverrideReason('')
                        }}>
                          Override Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* ---- ADMIN OVERRIDE MODAL ---- */}
      <Dialog
        open={!!overrideUser}
        onClose={() => setOverrideUser(null)}
        title="Override Academic Status"
      >
        {overrideUser && (
          <>
            <p className="mb-4 text-caption text-graytext-light">
              Updating status for <strong className="text-offwhite">{overrideUser.name}</strong>. This action will be audited.
            </p>
            <form onSubmit={(e) => {
              e.preventDefault()
              overrideMutation.mutate({
                userId: overrideUser.id,
                academicLevel: overrideLevel,
                academicStatus: overrideStatus,
                reason: overrideReason
              }, {
                onSuccess: () => {
                  setOverrideUser(null)
                  addToast('Status overridden successfully.')
                },
                onError: (err: any) => addToast(err.message || 'Failed to override status', 'error')
              })
            }} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Level</label>
                <Select
                  value={overrideLevel}
                  onChange={(e) => setOverrideLevel(e.target.value)}
                  options={[
                    { label: 'Foundation', value: 'foundation' },
                    { label: 'Diploma', value: 'diploma' },
                    { label: 'Degree', value: 'degree' }
                  ]}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Status</label>
                <Select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'On Break', value: 'on_break' },
                    { label: 'Withdrawn', value: 'withdrawn' }
                  ]}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Reason</label>
                <Input placeholder="e.g. Student requested manual update" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setOverrideUser(null)}>Cancel</Button>
                <Button type="submit" disabled={overrideMutation.isPending}>
                  {overrideMutation.isPending ? 'Saving…' : 'Override Status'}
                </Button>
              </div>
            </form>
          </>
        )}
      </Dialog>

      {/* ---- REGIONS & CITIES TAB ---- */}
      {tab === 'cities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-graytext-light">
                Cities are scoped to their official Region and used for regional analytics.
              </p>
              <p className="mt-0.5 text-caption text-graytext-mid">
                Quota guardrail: 1 meetup per Region per month.
              </p>
            </div>
          </div>

          {regions.length === 0 ? (
            <Card className="p-10 text-center text-graytext-light">No regions seeded yet.</Card>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Map Area */}
              <div className="flex-1 rounded-2xl border border-white/5 bg-white/[0.02] relative overflow-hidden flex items-center justify-center p-6">
                <IndiaMap
                  regions={regions}
                  selectedRegionId={selectedMapRegionId}
                  onSelect={setSelectedMapRegionId}
                />
              </div>

              {/* Side Panel Area */}
              <div className="w-full lg:w-[400px] shrink-0">
                {(() => {
                  const region = regions.find((r: any) => r.id === selectedMapRegionId)
                  if (!region) {
                    return (
                      <Card className="p-10 text-center text-graytext-mid h-full flex items-center justify-center border-dashed">
                        Select a region on the map to view details.
                      </Card>
                    )
                  }

                  const regionCities = cities.filter((c: any) => c.region_id === region.id)
                  const rcs = pors.filter((p: any) => p.por_type === 'Regional Coordinator' && p.region === region.name && p.active)

                  return (
                    <Card className="p-6 h-full flex flex-col">
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal shrink-0"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                            <span className="text-[18px] font-bold text-offwhite">{region.name}</span>
                          </div>
                          <div className="mt-1 text-caption text-graytext-mid">
                            {regionCities.length} {regionCities.length === 1 ? 'city' : 'cities'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setAddCityRegionId(region.id)
                            setAddCityRegionName(region.name)
                            setNewCityName('')
                            setAddCityError(null)
                            setShowAddCityModal(true)
                          }}
                          className="shrink-0 rounded-lg border border-teal/30 bg-teal/10 px-3 py-1.5 text-[12px] font-semibold text-teal hover:bg-teal/20 transition-colors"
                        >
                          + Add City
                        </button>
                      </div>

                      {regionCities.length > 0 && (
                        <div className="mb-6 flex flex-wrap gap-2">
                          {regionCities.map((c: any) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] text-offwhite"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="border-t border-white/5 pt-5 flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[13px] font-semibold text-graytext-mid uppercase tracking-wider">Regional Coordinators</h4>
                          <div className="flex items-center gap-2">
                            <Badge tone="teal">{rcs.length} / 10</Badge>
                            {rcs.length < 10 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPorTargetType('house')
                                  setSelectedOrgId('')
                                  setSelectedPorType('Regional Coordinator')
                                  setSelectedRegion(region.id)
                                  setShowPorModal(true)
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-2 py-1 text-[12px] font-medium text-graytext-mid hover:border-teal/40 hover:text-teal transition-colors"
                              >
                                + Add RC
                              </button>
                            )}
                          </div>
                        </div>

                        {rcs.length === 0 ? (
                          <p className="text-caption text-graytext-light italic">No RCs assigned yet.</p>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {rcs.map((rc: any) => (
                              <div key={rc.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors">
                                <div className="grid h-8 w-8 place-items-center rounded-full bg-teal/15 text-[12px] font-bold text-teal shrink-0">
                                  {(rc.member ?? '?').split(' ').map((n: string) => n[0]).join('')}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[14px] font-semibold text-offwhite truncate">{rc.member}</div>
                                  <div className="text-[11px] text-graytext-light truncate mt-0.5">{rc.org}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- BRAND KITS TAB (Phase 4 audit surface) ---- */}
      {tab === 'brand-kits' && (
        <div>
          <p className="mb-5 text-[14px] text-graytext-light">
            Brand Kits are set by each organisation's POR holders (Phase 4). Review logos, palettes, and social links across all organisations at a glance.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.filter((o: any) => o.type !== 'region').map((o: any) => (
              <Card key={o.id} hover onClick={() => navigate(`/orgs/${o.id}`)} className="p-5 cursor-pointer">
                <div className="flex items-start gap-3">
                  <OrgLogo org={o} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-offwhite text-[14px] truncate">{o.name}</span>
                      <Badge tone={ORG_TONE[o.type] || 'neutral'}>{o.type}</Badge>
                    </div>
                    {o.brand_kit ? (
                      <div className="mt-2 space-y-1.5">
                        {o.brand_kit.palette?.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {o.brand_kit.palette.slice(0, 5).map((hex: string, i: number) => (
                              <span key={i} className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: hex }} />
                            ))}
                            <span className="text-caption text-graytext-mid">{o.brand_kit.palette.length} colours</span>
                          </div>
                        )}
                        {o.brand_kit.social_links?.length > 0 && (
                          <div className="text-caption text-teal">{o.brand_kit.social_links.length} social link{o.brand_kit.social_links.length !== 1 ? 's' : ''}</div>
                        )}
                        {o.brand_kit.voice_tone && (
                          <div className="text-caption text-graytext-mid line-clamp-1 italic">"{o.brand_kit.voice_tone}"</div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-caption text-graytext-mid italic">No brand kit set yet</div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ---- ADD NEW SOCIETY MODAL ---- */}
      {showSeedModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-xl p-6 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/15 text-teal text-[20px]">
                  🏛️
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-offwhite">Add New Society</h3>
                  <p className="text-caption text-graytext-light">Register a student-led club or society with visual branding</p>
                </div>
              </div>
              <button onClick={resetSocietyForm} className="text-graytext-mid hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {societyFormError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-[13px] text-red-300 flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{societyFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSociety} className="space-y-4">
              {/* Society Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-caption font-semibold text-graytext-mid">
                    Society Name <span className="text-teal">*</span>
                  </label>
                  <span className="text-[11px] text-graytext-mid">Must be unique</span>
                </div>
                <Input
                  placeholder="e.g. Rhythm Dance Society, AI & Robotics Club"
                  value={societyName}
                  onChange={(e) => {
                    setSocietyName(e.target.value)
                    setSocietyFormError(null)
                  }}
                  required
                  autoFocus
                />
              </div>

              {/* Category / Type Searchable Dropdown */}
              <div className="relative" ref={categoryDropdownRef}>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                  Category / Type <span className="text-teal">*</span>
                </label>

                <div className="relative">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setCategoryDropdownOpen(prev => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setCategoryDropdownOpen(prev => !prev)
                      }
                    }}
                    className={cx(
                      'w-full flex items-center justify-between rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite cursor-pointer transition-all',
                      categoryDropdownOpen ? 'border-teal ring-2 ring-teal/40' : 'hover:border-white/20'
                    )}
                  >
                    <div className="flex items-center min-w-0">
                      <span className="truncate font-medium text-offwhite">
                        {selectedCategoryObj?.label || societyCategory || 'Select category...'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-graytext-mid">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={cx('transition-transform duration-200', categoryDropdownOpen && 'rotate-180')}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {/* Dropdown Menu */}
                  {categoryDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-white/15 bg-[#14151a] shadow-2xl p-2.5 animate-fade-up">
                      {/* Search / Input Field */}
                      <div className="relative mb-2">
                        <input
                          type="text"
                          placeholder="Search or enter new category..."
                          value={categoryQuery}
                          onChange={(e) => setCategoryQuery(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 pr-7 py-2 text-[13px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              e.stopPropagation()
                              const q = categoryQuery.trim()
                              if (q) {
                                const match = allCategories.find(c => c.value.toLowerCase() === q.toLowerCase() || c.label.toLowerCase() === q.toLowerCase())
                                if (match) {
                                  setSocietyCategory(match.value)
                                } else {
                                  setCustomCategories(prev => [...prev, { label: q, value: q }])
                                  setSocietyCategory(q)
                                }
                                setCategoryQuery('')
                                setCategoryDropdownOpen(false)
                              }
                            }
                          }}
                        />
                        {categoryQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setCategoryQuery('')
                            }}
                            className="absolute right-2.5 top-2 text-graytext-mid hover:text-offwhite text-[12px] p-0.5"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Filtered Categories List */}
                      <div className="max-h-[190px] overflow-y-auto custom-scrollbar space-y-0.5">
                        {filteredCategories.map((c) => {
                          const isSelected = (societyCategory || '').toLowerCase() === c.value.toLowerCase()
                          return (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => {
                                setSocietyCategory(c.value)
                                setCategoryQuery('')
                                setCategoryDropdownOpen(false)
                              }}
                              className={cx(
                                'w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                                isSelected ? 'bg-teal/15 text-teal font-semibold' : 'text-graytext-light hover:bg-white/5 hover:text-offwhite'
                              )}
                            >
                              <span>{c.label}</span>
                              {isSelected && <span className="text-teal font-bold">✓</span>}
                            </button>
                          )
                        })}

                        {filteredCategories.length === 0 && !categoryQuery.trim() && (
                          <div className="p-3 text-center text-caption text-graytext-mid">No categories found</div>
                        )}
                      </div>

                      {/* Add New Category option if typed query does not match an existing category */}
                      {categoryQuery.trim() && !allCategories.some(c => c.value.toLowerCase() === categoryQuery.trim().toLowerCase() || c.label.toLowerCase() === categoryQuery.trim().toLowerCase()) && (
                        <div className="border-t border-white/10 pt-2 mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const newCat = categoryQuery.trim()
                              setCustomCategories(prev => [...prev, { label: newCat, value: newCat }])
                              setSocietyCategory(newCat)
                              setCategoryQuery('')
                              setCategoryDropdownOpen(false)
                            }}
                            className="w-full flex items-center gap-2 rounded-lg bg-teal/10 hover:bg-teal/20 px-3 py-2 text-left text-[13px] text-teal font-semibold transition-colors"
                          >
                            <span>Add "<strong>{categoryQuery.trim()}</strong>" as new category</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Tagline / Catchphrase */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-caption font-semibold text-graytext-mid">
                    Tagline / Catchphrase
                  </label>
                  <span className="text-[11px] text-graytext-mid">{societyTagline.length}/255</span>
                </div>
                <Input
                  placeholder="e.g. Expressing creativity through rhythm, storytelling and movement"
                  value={societyTagline}
                  maxLength={255}
                  onChange={(e) => setSocietyTagline(e.target.value)}
                />
              </div>

              {/* Description / About */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-caption font-semibold text-graytext-mid">
                    Description / About
                  </label>
                  <span className="text-[11px] text-graytext-mid">{societyDescription.length}/1000</span>
                </div>
                <Textarea
                  placeholder="Describe the society's mission, regular activities, workshops, and how students can participate..."
                  value={societyDescription}
                  maxLength={1000}
                  rows={3}
                  onChange={(e) => setSocietyDescription(e.target.value)}
                />
              </div>

              {/* Logo and Banner Branding Uploads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                {/* Logo Image */}
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                    Logo Image <span className="text-[11px] text-graytext-mid font-normal">(Square, max 2MB)</span>
                  </label>
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-center flex flex-col items-center justify-center min-h-[110px] relative hover:border-teal/40 transition-colors">
                    {societyLogoPreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={societyLogoPreview}
                          alt="Logo Preview"
                          className="h-14 w-14 rounded-xl object-cover border border-white/20 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSocietyLogoFile(null)
                            setSocietyLogoPreview(null)
                          }}
                          className="text-[11px] text-red-300 hover:text-red-200 underline"
                        >
                          Remove Logo
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-1 text-caption text-graytext-mid hover:text-teal transition-colors">
                        <span className="text-[22px]">📷</span>
                        <span className="font-medium text-offwhite text-[12px]">Upload Society Logo</span>
                        <span className="text-[10px] text-graytext-light">PNG, JPG, WebP</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Banner Image */}
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                    Banner Image <span className="text-[11px] text-graytext-mid font-normal">(Wide, max 5MB)</span>
                  </label>
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-center flex flex-col items-center justify-center min-h-[110px] relative hover:border-teal/40 transition-colors">
                    {societyBannerPreview ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <img
                          src={societyBannerPreview}
                          alt="Banner Preview"
                          className="h-14 w-full rounded-lg object-cover border border-white/20 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSocietyBannerFile(null)
                            setSocietyBannerPreview(null)
                          }}
                          className="text-[11px] text-red-300 hover:text-red-200 underline"
                        >
                          Remove Banner
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-1 text-caption text-graytext-mid hover:text-teal transition-colors">
                        <span className="text-[22px]">🖼️</span>
                        <span className="font-medium text-offwhite text-[12px]">Upload Cover Banner</span>
                        <span className="text-[10px] text-graytext-light">PNG, JPG, WebP</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={handleBannerChange}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Online Presence & Social Links (Optional) */}
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <span className="text-caption font-semibold text-offwhite flex items-center gap-1.5">
                  <span>🔗</span> Online Links & Social Media <span className="text-graytext-mid font-normal text-[11px]">(Optional)</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-graytext-mid">Official Website</label>
                    <Input
                      placeholder="https://society.example.org"
                      value={societyWebsite}
                      onChange={(e) => setSocietyWebsite(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-graytext-mid">Instagram URL</label>
                    <Input
                      placeholder="https://instagram.com/..."
                      value={societyInstagram}
                      onChange={(e) => setSocietyInstagram(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-graytext-mid">LinkedIn URL</label>
                    <Input
                      placeholder="https://linkedin.com/company/..."
                      value={societyLinkedin}
                      onChange={(e) => setSocietyLinkedin(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-caption font-semibold text-graytext-mid">X (Twitter) URL</label>
                    <Input
                      placeholder="https://x.com/..."
                      value={societyX}
                      onChange={(e) => setSocietyX(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <Button type="button" variant="ghost" onClick={resetSocietyForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrgMutation.isPending}>
                  {createOrgMutation.isPending ? 'Creating Society…' : 'Create Society'}
                </Button>
              </div>
            </form>
          </Card>
        </div>,
        document.body
      )}

      {/* ---- AUTHORIZE ROLE MODAL ---- */}
      {showPorModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6">
            <h3 className="mb-1 text-[18px] font-bold text-offwhite">Authorize Elected Representative</h3>
            <p className="mb-4 text-caption text-graytext-light">
              Assign an official council role to an elected member. Permissions are granted immediately via their POR.
            </p>

            {assignmentError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">
                ⚠️ {assignmentError}
              </div>
            )}

            <form onSubmit={handleAssignPor} className="space-y-4">
              {/* Search Member by Email or Name */}
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                  Search Member by Email or Name
                </label>
                <Input
                  placeholder="Type email (e.g. saiteja@ekatva.os) or name..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value)
                    setUserId('')
                  }}
                />

                {/* Search Results List */}
                {userSearch.trim() !== '' && !userId && (
                  <div className="mt-2 max-h-[160px] overflow-y-auto rounded-xl border border-white/10 bg-onyx custom-scrollbar">
                    {users.length === 0 ? (
                      <div className="px-3.5 py-3 text-[13px] text-graytext-mid">No members found matching "{userSearch}"</div>
                    ) : (
                      users.map((u: any) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full border-b border-white/5 px-3.5 py-2.5 text-left text-[13px] last:border-0 hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                          onClick={() => setUserId(u.id)}
                        >
                          <div className="font-semibold text-offwhite">{u.name}</div>
                          <div className="text-graytext-mid">{u.email} <span className="mx-1">•</span> {u.city}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedUserObj && (
                <div className="rounded-lg border border-teal/30 bg-teal/5 px-3.5 py-2 text-[12px] text-teal">
                  ✓ Selected: <strong>{selectedUserObj.name}</strong> ({selectedUserObj.email})
                </div>
              )}

              {/* Entity Type Switcher (House vs Society) */}
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                  Organisation Scope <span className="text-teal">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPorTargetType('house')
                      setSelectedPorType(HOUSE_POR_TYPES[0])
                      setSelectedOrgId('')
                    }}
                    className={cx(
                      'flex items-center justify-center rounded-xl border py-2.5 text-[13px] font-semibold transition-all',
                      porTargetType === 'house'
                        ? 'border-gold/40 bg-gold/10 text-gold shadow-md'
                        : 'border-white/10 bg-onyx text-graytext-light hover:border-white/20'
                    )}
                  >
                    House
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPorTargetType('society')
                      setSelectedPorType(SOCIETY_POR_TYPES[0])
                      setSelectedOrgId('')
                    }}
                    className={cx(
                      'flex items-center justify-center rounded-xl border py-2.5 text-[13px] font-semibold transition-all',
                      porTargetType === 'society'
                        ? 'border-teal/40 bg-teal/10 text-teal shadow-md'
                        : 'border-white/10 bg-onyx text-graytext-light hover:border-white/20'
                    )}
                  >
                    Society
                  </button>
                </div>
              </div>

              {/* Target Organisation & Position Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                    {porTargetType === 'house' ? 'House' : 'Society'} <span className="text-teal">*</span>
                  </label>
                  {porTargetType === 'house' ? (
                    <Select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      options={[
                        { label: '-- Select House --', value: '' },
                        ...houses.map((h: any) => ({
                          label: h.name,
                          value: h.id,
                        })),
                      ]}
                    />
                  ) : (
                    <Select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      options={[
                        { label: '-- Select Society --', value: '' },
                        ...societies.map((s: any) => ({
                          label: s.name,
                          value: s.id,
                        })),
                      ]}
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                    Position <span className="text-teal">*</span>
                  </label>
                  <Select
                    value={selectedPorType}
                    onChange={(e) => setSelectedPorType(e.target.value)}
                    options={
                      porTargetType === 'house'
                        ? HOUSE_POR_TYPES.map((pt) => ({ label: pt, value: pt }))
                        : SOCIETY_POR_TYPES.map((pt) => ({ label: pt, value: pt }))
                    }
                  />
                </div>
              </div>

              {/* Council tier / Authority preview */}
              <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-2.5 text-[13px] flex items-center justify-between">
                <span className="text-graytext-mid">Authority & Tier:</span>
                {selectedPorType === 'House Secretary' || selectedPorType === 'Deputy House Secretary' ? (
                  <Badge tone="gold">Upper House Council</Badge>
                ) : selectedPorType === 'Regional Coordinator' ? (
                  <Badge tone="teal">Lower House Council</Badge>
                ) : selectedPorType === 'Society Secretary' || selectedPorType === 'Society Deputy Secretary' ? (
                  <Badge tone="teal">Society Leadership (Core Committee)</Badge>
                ) : (
                  <span className="text-graytext-mid">House Operations</span>
                )}
              </div>

              {/* Region dropdown — only visible for RC */}
              {isRC && porTargetType === 'house' && (
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                    Region <span className="text-amber-400">(required for RC)</span>
                  </label>
                  <Select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    options={[
                      { label: '-- Select Region --', value: '' },
                      ...regions.map((r: any) => ({ label: r.name, value: r.id })),
                    ]}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Term</label>
                <Input placeholder="e.g. May 2026" value={porTerm} onChange={(e) => setPorTerm(e.target.value)} required />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowPorModal(false)
                    setAssignmentError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={assignPorMutation.isPending || !userId.trim() || !selectedOrgId}>
                  {assignPorMutation.isPending ? 'Authorizing…' : 'Authorize Role'}
                </Button>
              </div>
            </form>
          </Card>
        </div>,
        document.body
      )}

      {/* ---- ADD CITY MODAL ---- */}
      {showAddCityModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6">
            <h3 className="mb-1 text-[18px] font-bold text-offwhite">Add City</h3>
            <p className="mb-4 text-caption text-graytext-light">
              Adding a city to <strong>{addCityRegionName}</strong>.
            </p>
            <form onSubmit={handleAddCity} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">City Name</label>
                <Input
                  placeholder="e.g. Warangal"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  required
                />
              </div>
              {addCityError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[13px] text-red-200">
                  {addCityError}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddCityModal(false)}>Cancel</Button>
                <Button type="submit" disabled={addCityMutation.isPending}>
                  {addCityMutation.isPending ? 'Adding…' : 'Add City'}
                </Button>
              </div>
            </form>
          </Card>
        </div>,
        document.body
      )}

      {/* ---- HOUSE DETAIL MODAL ---- */}
      {viewingHouseId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setViewingHouseId(null) }}>
          <Card className="relative w-full max-w-2xl p-8 overflow-hidden bg-onyx">
            {(() => {
              const h = orgs.find((o: any) => o.id === viewingHouseId)
              if (!h) return null
              // Real data wins, and both paths go through the same gate. A
              // second rendering path for "trusted" seeded URLs is how the safe
              // path becomes the special case.
              const websiteHref = safeExternalHref(h.website ?? HOUSE_META[h.name]?.website)
              const secretary = pors.find((p: any) => p.org === h.name && p.por_type === 'House Secretary' && p.active)
              const deputy = pors.find((p: any) => p.org === h.name && p.por_type === 'Deputy House Secretary' && p.active)
              const webAdmin = pors.find((p: any) => p.org === h.name && p.por_type === 'Web Admin' && p.active)
              const rcs = pors.filter((p: any) => p.org === h.name && p.por_type === 'Regional Coordinator' && p.active)

              return (
                <>
                  <div className="absolute right-4 top-4">
                    <button onClick={() => setViewingHouseId(null)} className="text-graytext-mid hover:text-white transition-colors">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  <div className="mb-8 flex items-center gap-5">
                    <OrgLogo org={h} size={80} />
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-[28px] font-bold text-offwhite tracking-tight">{h.name}</h2>
                        {websiteHref && (
                          <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="ml-2 flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[13px] font-semibold text-graytext-mid transition-colors hover:bg-white/10 hover:text-offwhite">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            Website
                          </a>
                        )}
                        {/* The organisation profile's second entry point. */}
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/orgs/${h.id}`)}>
                          Open organisation profile
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/8 bg-onyx p-4 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 text-[100px] opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 text-emerald-400">👑</div>
                      <p className="text-caption font-semibold text-graytext-mid mb-1 uppercase tracking-wider">House Secretary</p>
                      {secretary ? (
                        <>
                          <div className="text-[18px] font-bold text-emerald-300">{secretary.member}</div>
                          <div className="text-caption text-graytext-light mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Term: {secretary.term}
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPorTargetType('house')
                            setSelectedOrgId(h.id)
                            setSelectedPorType('House Secretary')
                            setShowPorModal(true)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-[13px] font-medium text-graytext-mid hover:border-emerald-400/40 hover:text-emerald-300 transition-colors"
                        >
                          + Assign Secretary
                        </button>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/8 bg-onyx p-4 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 text-[100px] opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 text-teal">⭐</div>
                      <p className="text-caption font-semibold text-graytext-mid mb-1 uppercase tracking-wider">Deputy Secretary</p>
                      {deputy ? (
                        <>
                          <div className="text-[18px] font-bold text-teal">{deputy.member}</div>
                          <div className="text-caption text-graytext-light mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal"></span>
                            Term: {deputy.term}
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPorTargetType('house')
                            setSelectedOrgId(h.id)
                            setSelectedPorType('Deputy House Secretary')
                            setShowPorModal(true)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-[13px] font-medium text-graytext-mid hover:border-teal/40 hover:text-teal transition-colors"
                        >
                          + Assign Deputy
                        </button>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/8 bg-onyx p-4 relative overflow-hidden group">
                      <div className="absolute -right-6 -top-6 text-[100px] opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 text-blue-400">💻</div>
                      <p className="text-caption font-semibold text-graytext-mid mb-1 uppercase tracking-wider">Web Admin</p>
                      {webAdmin ? (
                        <>
                          <div className="text-[18px] font-bold text-blue-400">{webAdmin.member}</div>
                          <div className="text-caption text-graytext-light mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            Term: {webAdmin.term}
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPorTargetType('house')
                            setSelectedOrgId(h.id)
                            setSelectedPorType('Web Admin')
                            setShowPorModal(true)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-[13px] font-medium text-graytext-mid hover:border-blue-400/40 hover:text-blue-300 transition-colors"
                        >
                          + Assign Web Admin
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-white/8 bg-onyx p-5 flex items-center justify-between">
                    <div>
                      <p className="text-caption font-semibold text-graytext-mid uppercase tracking-wider">Regional Coordinators</p>
                      <p className="text-[13px] text-graytext-light mt-1">Responsible for regional meetups and student support.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[24px] font-bold text-offwhite">{rcs.length} <span className="text-[16px] text-graytext-mid font-medium">/ 10</span></div>
                      </div>
                      {rcs.length < 10 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPorTargetType('house')
                            setSelectedOrgId(h.id)
                            setSelectedPorType('Regional Coordinator')
                            setShowPorModal(true)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-[13px] font-medium text-graytext-mid hover:border-teal/40 hover:text-teal transition-colors"
                        >
                          + Add RC
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </Card>
        </div>,
        document.body
      )}
      {/* ---- BULK ASSIGN MODAL ---- */}
      {showBulkModal && (
        <BulkAssignModal
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false)
            qc.invalidateQueries({ queryKey: ['pors'] })
          }}
        />
      )}

    </div>
  )
}
