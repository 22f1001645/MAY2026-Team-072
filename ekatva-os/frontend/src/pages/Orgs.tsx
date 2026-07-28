import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCities, useOrgs, usePors, useUsers, useCreateOrg, useAssignPor, useRegions } from '../lib/queries'
import { api } from '../lib/api'
import { Badge, Button, Card, Input, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

const ORG_TONE: Record<string, any> = {
  house: 'gold',
  society: 'teal',
  region: 'teal',
  council: 'warn',
}

// 12 Forest Houses with national park metadata
const HOUSE_META: Record<string, { park: string; state: string; color: string }> = {
  'Bandipur House':    { park: 'Bandipur National Park',    state: 'Karnataka',    color: '#4ade80' },
  'Corbett House':     { park: 'Jim Corbett National Park', state: 'Uttarakhand',  color: '#60a5fa' },
  'Gir House':         { park: 'Gir Forest National Park',  state: 'Gujarat',      color: '#f59e0b' },
  'Kanha House':       { park: 'Kanha National Park',       state: 'M.P.',         color: '#a78bfa' },
  'Kaziranga House':   { park: 'Kaziranga National Park',   state: 'Assam',        color: '#34d399' },
  'Nallamala House':   { park: 'Nagarjunasagar-Srisailam',  state: 'Telangana',    color: '#f97316' },
  'Namdapha House':    { park: 'Namdapha National Park',    state: 'Arunachal P.', color: '#06b6d4' },
  'Nilgiri House':     { park: 'Nilgiri Biosphere Reserve', state: 'Tamil Nadu',   color: '#5CE6C9' },
  'Pichavaram House':  { park: 'Pichavaram Mangrove Forest',state: 'Tamil Nadu',   color: '#e879f9' },
  'Saranda House':     { park: 'Saranda Forest',            state: 'Jharkhand',    color: '#fb923c' },
  'Sundarbans House':  { park: 'Sundarbans National Park',  state: 'West Bengal',  color: '#2dd4bf' },
  'Wayanad House':     { park: 'Wayanad Wildlife Sanctuary',state: 'Kerala',       color: '#a3e635' },
}

const POR_TYPES = [
  'House Secretary',
  'Deputy House Secretary',
  'Regional Coordinator',
  'Web Admin',
  'Event Lead',
  'Society Secretary',
  'Technical Secretary',
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
  const [tab, setTab] = useState<'houses' | 'orgs' | 'pors' | 'councils' | 'cities'>('houses')
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

  const [showSeedModal, setShowSeedModal] = useState(false)
  const [showPorModal, setShowPorModal] = useState(false)

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
      { onSuccess: () => { setShowSeedModal(false); setOrgName('') } },
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
        },
        onError: (err: any) => {
          setAssignmentError(err.message || 'Failed to assign POR position.')
        },
      },
    )
  }

  if (lo) return <Loading label="Loading organisations…" />
  if (eo) return <ErrorState error={erro} />

  const tabs = [
    ['houses', `12 Forest Houses`],
    ['pors', `POR Assignments (${pors.length})`],
    ['councils', `Council Members`],
    ['orgs', `All Orgs (${orgs.length})`],
    ['cities', `Regions & Cities`],
  ] as const

  const selectedUserObj = users.find((u: any) => u.id === userId || u.email === userId)

  return (
    <div>
      <SectionTitle
        eyebrow="Admin"
        title="Orgs, PORs & Councils"
        sub="Manage the 12 Forest Houses, 10 Regions, Upper House Council (Secretaries) and Lower House Council (Regional Coordinators). Permissions follow PORs, not logins."
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
                <Card key={h.id} hover className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[18px]"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      🌿
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

      {/* ---- POR ASSIGNMENTS TAB ---- */}
      {tab === 'pors' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setShowPorModal(true)}>+ Authorize Role</Button>
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
                  </tr>
                </thead>
                <tbody>
                  {pors.map((p: any) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          <p className="mt-3 text-caption text-graytext-mid">Past PORs preserved for historical record (P4).</p>
        </div>
      )}

      {/* ---- COUNCIL MEMBERS TAB ---- */}
      {tab === 'councils' && (
        <div>
          <div className="mb-4 flex gap-2">
            {(['upper', 'lower'] as const).map((ct) => (
              <button
                key={ct}
                onClick={() => setCouncilTab(ct)}
                className={cx(
                  'rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors',
                  councilTab === ct
                    ? ct === 'upper' ? 'border-gold/40 bg-gold/10 text-gold' : 'border-teal/40 bg-teal/10 text-teal'
                    : 'border-white/10 text-graytext-mid hover:text-offwhite',
                )}
              >
                {ct === 'upper' ? `Upper House Council (${upperCouncil.length})` : `Lower House Council (${lowerCouncil.length})`}
              </button>
            ))}
          </div>

          {councilTab === 'upper' && (
            <div>
              <p className="mb-3 text-caption text-graytext-mid">
                12 House Secretaries + 12 Deputy House Secretaries — governs macro policies with Student Affairs.
              </p>
              {upperCouncil.length === 0 ? (
                <Card className="p-10 text-center text-graytext-light">No Upper House Council members yet.</Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upperCouncil.map((p: any) => (
                    <Card key={p.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-[13px] font-bold text-gold">
                          {(p.member ?? '?').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-offwhite">{p.member}</div>
                          <div className="text-caption text-graytext-light">{p.org}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge tone="gold">{p.por_type}</Badge>
                        <span className="text-caption text-graytext-mid">{p.term}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {councilTab === 'lower' && (
            <div>
              <p className="mb-3 text-caption text-graytext-mid">
                10 Regional Coordinators per House (120 total) — handles regional meetups, academic support, and orientation.
              </p>
              {lowerCouncil.length === 0 ? (
                <Card className="p-10 text-center text-graytext-light">No Lower House Council members yet.</Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lowerCouncil.map((p: any) => (
                    <Card key={p.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-teal/15 text-[13px] font-bold text-teal">
                          {(p.member ?? '?').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-offwhite">{p.member}</div>
                          <div className="text-caption text-graytext-light">{p.org}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <Badge tone="teal">RC</Badge>
                        <span className="text-caption text-graytext-mid">{p.region ?? 'All Regions'}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- ALL ORGS TAB ---- */}
      {tab === 'orgs' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setShowSeedModal(true)}>+ Seed Organisation</Button>
          </div>
          <div className="space-y-8">
            {Array.from(new Set(orgs.map((o: any) => o.type))).map((type: any) => {
              const typedOrgs = orgs.filter((o: any) => o.type === type)
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
            <div className="grid gap-5 lg:grid-cols-2">
              {regions.map((region: any) => {
                const regionCities = cities.filter((c: any) => c.region_id === region.id)
                return (
                  <Card key={region.id} className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[16px]">🗺️</span>
                          <span className="text-[15px] font-bold text-offwhite">{region.name}</span>
                        </div>
                        <div className="mt-0.5 text-caption text-graytext-mid">
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
                        className="shrink-0 rounded-lg border border-teal/30 bg-teal/10 px-2.5 py-1 text-[12px] font-semibold text-teal hover:bg-teal/20 transition-colors"
                      >
                        + Add City
                      </button>
                    </div>

                    {regionCities.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-white/10 py-3 text-center text-[12px] text-graytext-mid">
                        No cities yet — add one above.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
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
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ---- SEED ORGANISATION MODAL ---- */}
      {showSeedModal && (
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
        </div>
      )}

      {/* ---- AUTHORIZE ROLE MODAL ---- */}
      {showPorModal && (
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
              </div>

              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Select Student Candidate</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                >
                  <option value="">-- Select Member ({users.length} matching) --</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.email} ({u.city})
                    </option>
                  ))}
                </select>
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
                    {(houses.length > 0 ? houses : orgs.filter((o: any) => o.type === 'house')).map((h: any) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">Position</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
                    value={selectedPorType}
                    onChange={(e) => setSelectedPorType(e.target.value)}
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
        </div>
      )}

      {/* ---- ADD CITY TO REGION MODAL ---- */}
      {showAddCityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <h3 className="mb-1 text-[18px] font-bold text-offwhite">Add City to Region</h3>
            <p className="mb-4 text-caption text-graytext-light">
              Adding city to: <span className="font-semibold text-teal">{addCityRegionName}</span>
            </p>

            {addCityError && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">
                ⚠️ {addCityError}
              </div>
            )}

            <form onSubmit={handleAddCity} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">City Name</label>
                <Input
                  placeholder="e.g. Warangal"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddCityModal(false)}>Cancel</Button>
                <Button type="submit" disabled={addCityMutation.isPending}>
                  {addCityMutation.isPending ? 'Adding…' : 'Add City'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
