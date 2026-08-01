import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCities, useOrgs, useHouses, usePors, useUsers, useCreateOrg, useAssignPor, useRegions, useDeactivatePor } from '../lib/queries'
import { api } from '../lib/api'
import { Badge, Button, Card, Input, SectionTitle, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'
import { IndiaMap } from '../components/IndiaMap'

const ORG_TONE: Record<string, any> = {
  house: 'gold',
  society: 'teal',
  region: 'teal',
  council: 'warn',
}

// 12 Forest Houses with national park metadata
const HOUSE_META: Record<string, { park: string; state: string; color: string; logo: string; imageLogo?: string; website?: string }> = {
  'Bandipur House':    { park: 'Bandipur National Park',    state: 'Karnataka',    color: '#4ade80', logo: '🐘', imageLogo: '/houses/bandipur.png', website: 'https://bandipur.iitmbs.org/' },
  'Corbett House':     { park: 'Jim Corbett National Park', state: 'Uttarakhand',  color: '#60a5fa', logo: '🐅', imageLogo: '/houses/corbett.png', website: 'https://corbett.iitmbs.org/' },
  'Gir House':         { park: 'Gir Forest National Park',  state: 'Gujarat',      color: '#f59e0b', logo: '🦁', imageLogo: '/houses/gir.png', website: 'https://sites.google.com/student.onlinedegree.iitm.ac.in/gir-house' },
  'Kanha House':       { park: 'Kanha National Park',       state: 'M.P.',         color: '#a78bfa', logo: '🦌', imageLogo: '/houses/kanha.png', website: 'https://kanha.iitmbs.org/' },
  'Kaziranga House':   { park: 'Kaziranga National Park',   state: 'Assam',        color: '#34d399', logo: '🦏', imageLogo: '/houses/kaziranga.png', website: 'https://kaziranga.iitmbs.org/' },
  'Nallamala House':   { park: 'Nagarjunasagar-Srisailam',  state: 'Telangana',    color: '#f97316', logo: '🐆', imageLogo: '/houses/nallamala.png', website: 'https://nallamala.iitmbs.org/' },
  'Namdapha House':    { park: 'Namdapha National Park',    state: 'Arunachal P.', color: '#06b6d4', logo: '🦅', imageLogo: '/houses/namdapha.png', website: 'https://namdapha.iitmbs.org/' },
  'Nilgiri House':     { park: 'Nilgiri Biosphere Reserve', state: 'Tamil Nadu',   color: '#5CE6C9', logo: '⛰️', imageLogo: '/houses/nilgiri.png', website: 'https://nilgiri.iitmbs.org/' },
  'Pichavaram House':  { park: 'Pichavaram Mangrove Forest',state: 'Tamil Nadu',   color: '#e879f9', logo: '🛶', imageLogo: '/houses/pichavaram.png', website: 'https://pichavaram.iitmbs.org/' },
  'Saranda House':     { park: 'Saranda Forest',            state: 'Jharkhand',    color: '#fb923c', logo: '🌳', imageLogo: '/houses/saranda.png', website: 'https://saranda.iitmbs.org/' },
  'Sundarbans House':  { park: 'Sundarbans National Park',  state: 'West Bengal',  color: '#2dd4bf', logo: '🐊', imageLogo: '/houses/sundarbans.png', website: 'https://sundarbans.iitmbs.org/#/' },
  'Wayanad House':     { park: 'Wayanad Wildlife Sanctuary',state: 'Kerala',       color: '#a3e635', logo: '🐒', imageLogo: '/houses/wayanad.png', website: 'https://wayanad.iitmbs.org/' },
}

const POR_TYPES = [
  'House Secretary',
  'Deputy House Secretary',
  'Regional Coordinator',
  'Web Admin',
]

const REGIONS = [
  'Delhi (Delhi-NCR)',
  'Chennai (Tamil Nadu)',
  'Bengaluru (Karnataka, Kerala)',
  'Hyderabad (AP & Telangana)',
  'Mumbai (Maharashtra, Gujarat)',
  'Kolkata (WB, NE, Odisha)',
  'Patna (Bihar, Jharkhand, Chhattisgarh)',
  'Chandigarh (Punjab, HP, RJ, J&K)',
  'Lucknow (UP, Gwalior)',
  'International',
]

export default function Orgs() {
  const [tab, setTab] = useState<'houses' | 'orgs' | 'pors' | 'cities'>('houses')
  const [councilTab, setCouncilTab] = useState<'upper' | 'lower'>('upper')

  const [userSearch, setUserSearch] = useState('')

  const { data: orgs = [], isLoading: lo, isError: eo, error: erro } = useOrgs()
  const { data: cities = [] } = useCities()
  const { data: pors = [] } = usePors()
  const { data: users = [] } = useUsers(userSearch.trim())
  const { data: houses = [] } = useQuery({ queryKey: ['houses'], queryFn: () => api.orgs().then(r => r.filter((o: any) => o.type === 'house')) })
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: () => api.orgs().then(r => r.filter((o: any) => o.type === 'region')) })

  const createOrgMutation = useCreateOrg()
  const assignPorMutation = useAssignPor()
  const deactivatePorMutation = useDeactivatePor()
  const { addToast } = useToast()

  const [showSeedModal, setShowSeedModal] = useState(false)
  const [showPorModal, setShowPorModal] = useState(false)
  const [viewingHouseId, setViewingHouseId] = useState<string | null>(null)
  const [selectedMapRegionId, setSelectedMapRegionId] = useState<string | null>(null)

  // Seed Org form state
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('society')
  const [orgCity, setOrgCity] = useState('Hyderabad')

  // Assign POR form state
  const [userId, setUserId] = useState('')
  const [selectedHouseId, setSelectedHouseId] = useState('')
  const [selectedPorType, setSelectedPorType] = useState(POR_TYPES[0])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [porTerm, setPorTerm] = useState('May 2026')
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  const isRC = selectedPorType === 'Regional Coordinator'
  const upperCouncil = pors.filter((p: any) => p.council_tier === 'upper_house_council' && p.active)
  const lowerCouncil = pors.filter((p: any) => p.council_tier === 'lower_house_council' && p.active)

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
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)
  const confirmPor = pors.find((p: any) => p.id === confirmDeactivateId)

  const qc = useQueryClient()

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

  const handleSeedOrg = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return
    createOrgMutation.mutate(
      { name: orgName.trim(), type: orgType, city: orgCity },
      { onSuccess: () => { setShowSeedModal(false); setOrgName(''); addToast('Organisation seeded successfully!') } },
    )
  }

  const handleAssignPor = (e: React.FormEvent) => {
    e.preventDefault()
    setAssignmentError(null)
    if (!userId.trim() || !selectedHouseId) return
    const regionOrg = regions.find((r: any) => r.name === selectedRegion)

    assignPorMutation.mutate(
      {
        orgId: selectedHouseId,
        user_id: userId.trim(),
        por_type: selectedPorType,
        term: porTerm,
        region_id: isRC ? regionOrg?.id : undefined,
      },
      {
        onSuccess: () => {
          setShowPorModal(false)
          setUserId('')
          setUserSearch('')
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
  ] as const

  const selectedUserObj = users.find((u: any) => u.id === userId || u.email === userId)

  return (
    <div>
      <SectionTitle
        eyebrow="Admin"
        title="Orgs, PORs & Cities"
        sub="Manage Forest Houses, Regions, Societies, and the POR Directory. Permissions follow PORs."
        right={
          <div className="flex gap-3">
            <Button size="sm" onClick={() => setShowSeedModal(true)}>+ Seed Org</Button>
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
            {(houses.length > 0 ? houses : orgs.filter((o: any) => o.type === 'house')).map((h: any) => {
              const meta = HOUSE_META[h.name] ?? { park: h.name, state: '', color: '#5CE6C9' }
              const secretary = pors.find((p: any) => p.org === h.name && p.por_type === 'House Secretary' && p.active)
              const deputy = pors.find((p: any) => p.org === h.name && p.por_type === 'Deputy House Secretary' && p.active)
              const rcs = pors.filter((p: any) => p.org === h.name && p.por_type === 'Regional Coordinator' && p.active)
              return (
                <Card key={h.id} hover className="p-5" onClick={() => setViewingHouseId(h.id)}>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[18px] overflow-hidden"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      {meta.imageLogo ? (
                        <img src={meta.imageLogo} alt={`${h.name} logo`} className="h-full w-full object-cover" />
                      ) : (
                        meta.logo
                      )}
                    </div>
                    <Badge tone="gold">{meta.state}</Badge>
                  </div>
                  <div className="text-[15px] font-bold text-offwhite">{h.name}</div>
                  <div className="mt-0.5 text-caption text-graytext-light">{meta.park}</div>
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
            <select
              className="rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
              value={porOrgFilter}
              onChange={e => setPorOrgFilter(e.target.value)}
            >
              <option value="">All Houses / Orgs</option>
              {Array.from(new Set(pors.map((p: any) => p.org))).sort().map((org: any) => (
                <option key={org} value={org}>{org}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
              value={porRoleFilter}
              onChange={e => setPorRoleFilter(e.target.value)}
            >
              <option value="">All Positions</option>
              {Array.from(new Set(pors.map((p: any) => p.por_type))).sort().map((role: any) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
              value={porRegionFilter}
              onChange={e => setPorRegionFilter(e.target.value)}
            >
              <option value="">All Regions</option>
              {Array.from(new Set(pors.map((p: any) => p.region).filter(Boolean))).sort().map((region: any) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
              value={porStatusFilter}
              onChange={e => setPorStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="past">Past Only</option>
            </select>
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
        <div>
          <div className="space-y-8">
            {Array.from(new Set(filteredOrgs.map((o: any) => o.type))).map((type: any) => {
              const typedOrgs = filteredOrgs.filter((o: any) => o.type === type)
              return (
                <div key={type}>
                  <h3 className="mb-4 border-b border-white/10 pb-2 text-[16px] font-bold capitalize text-offwhite">
                    {type === 'society' ? 'Societies' : `${type}s`} <span className="ml-1 font-normal text-graytext-mid">({typedOrgs.length})</span>
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {typedOrgs.map((o: any) => (
                      <Card key={o.id} hover className="p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <Badge tone={ORG_TONE[o.type]}>{o.type}</Badge>
                        </div>
                        <div className="text-[15px] font-semibold text-offwhite">{o.name}</div>
                        <div className="mt-1 text-caption text-graytext-light">{o.city}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- REGIONS & CITIES TAB ---- */}
      {tab === 'cities' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] text-graytext-light">
                Cities are scoped to their official Region and used for regional analytics.
              </p>
              <p className="mt-0.5 text-caption text-graytext-mid">
                Quota guardrail: 1 meetup per Region per month (FR-B2).
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
                            <span className="text-[18px]">📍</span>
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
                          <Badge tone="teal">{rcs.length} / 10</Badge>
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

      {/* ---- SEED ORGANISATION MODAL ---- */}
      {showSeedModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <h3 className="mb-1 text-[18px] font-bold text-offwhite">Seed New Organisation</h3>
            <p className="mb-4 text-caption text-graytext-light">Add a Society, Council, or additional org.</p>
            <form onSubmit={handleSeedOrg} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Name</label>
                <Input placeholder="e.g. Rhythm Dance Society" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Type</label>
                  <select className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
                    value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                    <option value="society">Society</option>
                    <option value="council">Council</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">City</label>
                  <select className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
                    value={orgCity} onChange={(e) => setOrgCity(e.target.value)}>
                    {cities.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowSeedModal(false)}>Cancel</Button>
                <Button type="submit" disabled={createOrgMutation.isPending}>
                  {createOrgMutation.isPending ? 'Seeding…' : 'Seed Organisation'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">House</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
                    value={selectedHouseId}
                    onChange={(e) => setSelectedHouseId(e.target.value)}
                    required
                  >
                    <option value="">-- Select House --</option>
                    {houses.map((h: any) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Position</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
                    value={selectedPorType}
                    onChange={(e) => { setSelectedPorType(e.target.value); setSelectedHouseId('') }}
                  >
                    {POR_TYPES.map((pt) => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
              </div>

              {/* Council tier preview */}
              <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-2.5 text-[13px]">
                <span className="text-graytext-mid">Auto-assigned to: </span>
                {selectedPorType === 'House Secretary' || selectedPorType === 'Deputy House Secretary' ? (
                  <Badge tone="gold">Upper House Council</Badge>
                ) : selectedPorType === 'Regional Coordinator' ? (
                  <Badge tone="teal">Lower House Council</Badge>
                ) : (
                  <span className="text-graytext-mid">House Operations</span>
                )}
              </div>

              {/* Region dropdown — only visible for RC */}
              {isRC && (
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                    Region <span className="text-amber-400">(required for RC)</span>
                  </label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    required={isRC}
                  >
                    <option value="">-- Select Region --</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Term</label>
                <Input placeholder="e.g. May 2026" value={porTerm} onChange={(e) => setPorTerm(e.target.value)} required />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowPorModal(false)}>Cancel</Button>
                <Button type="submit" disabled={assignPorMutation.isPending}>
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
          <Card className="relative w-full max-w-2xl p-8 overflow-hidden">
            {(() => {
              const h = orgs.find((o: any) => o.id === viewingHouseId)
              if (!h) return null
              const meta = HOUSE_META[h.name] ?? { park: h.name, state: '', color: '#5CE6C9', logo: '🌿' }
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
                    <div
                      className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-[36px] shadow-lg overflow-hidden"
                      style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}
                    >
                      {meta.imageLogo ? (
                        <img src={meta.imageLogo} alt={`${h.name} logo`} className="h-full w-full object-cover" />
                      ) : (
                        meta.logo
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-[28px] font-bold text-offwhite tracking-tight">{h.name}</h2>
                        <Badge tone="gold">{meta.state}</Badge>
                        {meta.website && (
                          <a href={meta.website} target="_blank" rel="noreferrer" className="ml-2 flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[13px] font-semibold text-graytext-mid transition-colors hover:bg-white/10 hover:text-offwhite">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            Website
                          </a>
                        )}
                      </div>
                      <p className="mt-1 text-[15px] text-graytext-light flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>
                        {meta.park}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 relative overflow-hidden group">
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
                        <div className="text-[16px] font-medium text-graytext-mid italic">Vacant Position</div>
                      )}
                    </div>
                    
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 relative overflow-hidden group">
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
                        <div className="text-[16px] font-medium text-graytext-mid italic">Vacant Position</div>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 relative overflow-hidden group">
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
                        <div className="text-[16px] font-medium text-graytext-mid italic">Vacant Position</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-5 flex items-center justify-between">
                    <div>
                      <p className="text-caption font-semibold text-graytext-mid uppercase tracking-wider">Regional Coordinators</p>
                      <p className="text-[13px] text-graytext-light mt-1">Responsible for regional meetups and student support.</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[24px] font-bold text-offwhite">{rcs.length} <span className="text-[16px] text-graytext-mid font-medium">/ 10</span></div>
                    </div>
                  </div>
                </>
              )
            })()}
          </Card>
        </div>,
        document.body
      )}
    </div>
  )
}
