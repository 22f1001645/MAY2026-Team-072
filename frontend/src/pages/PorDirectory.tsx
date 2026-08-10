import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePors, usePaginatedPors, useUsers, useAssignPor, useDeactivatePor, useConstants } from '../lib/queries'
import { api } from '../lib/api'
import { Badge, Button, Card, Input, SectionTitle, useToast } from '../components/ui'
import { Loading } from '../components/states'
import { useQuery } from '@tanstack/react-query'

export default function PorDirectory() {
  const { data: constants } = useConstants()
  const POR_TYPES = constants?.POR_TYPES ?? []
  const REGIONS = constants?.REGIONS ?? []

  const { data: pors = [] } = usePors()
  const { data: houses = [] } = useQuery({ queryKey: ['houses'], queryFn: () => api.orgs().then(r => r.filter((o: any) => o.type === 'house')) })
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: () => api.orgs().then(r => r.filter((o: any) => o.type === 'region')) })

  const assignPorMutation = useAssignPor()
  const deactivatePorMutation = useDeactivatePor()
  const { addToast } = useToast()
  const qc = useQueryClient()

  // Search & filter state
  const [porSearch, setPorSearch] = useState('')
  const [porOrgFilter, setPorOrgFilter] = useState('')
  const [porRoleFilter, setPorRoleFilter] = useState('')
  const [porStatusFilter, setPorStatusFilter] = useState('')
  const [porRegionFilter, setPorRegionFilter] = useState('')
  const [porPage, setPorPage] = useState(1)
  const porLimit = 10

  const { data: paginatedPors, isLoading: isPaginatedLoading } = usePaginatedPors(
    porPage,
    porLimit,
    porStatusFilter === 'active' ? 'true' : porStatusFilter === 'past' ? 'false' : '',
    porOrgFilter
  )

  // Deactivate confirmation
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)
  const confirmPor = pors.find((p: any) => p.id === confirmDeactivateId) || paginatedPors?.items?.find((p: any) => p.id === confirmDeactivateId)

  // Assign POR modal state
  const [showPorModal, setShowPorModal] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userId, setUserId] = useState('')
  const { data: users = [] } = useUsers(userSearch.trim())
  const [selectedHouseId, setSelectedHouseId] = useState('')
  const [selectedPorType, setSelectedPorType] = useState(POR_TYPES[0])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [porTerm, setPorTerm] = useState('May 2026')
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  const isRC = selectedPorType === 'Regional Coordinator'
  const selectedUserObj = users.find((u: any) => u.id === userId || u.email === userId)

  // Council tab state
  const [councilTab, setCouncilTab] = useState<'upper' | 'lower'>('upper')
  const upperCouncil = pors.filter((p: any) => p.council_tier === 'upper_house_council' && p.active)
  const lowerCouncil = pors.filter((p: any) => p.council_tier === 'lower_house_council' && p.active)

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
          qc.invalidateQueries({ queryKey: ['pors'] })
          qc.invalidateQueries({ queryKey: ['pors-paginated'] })
          addToast('Role authorized successfully!')
        },
        onError: (err: any) => {
          setAssignmentError(err.message || 'Failed to assign POR position.')
        },
      },
    )
  }

  const exportCSV = () => {
    const header = ['Member,Org,Position,Region,Council,Term,Status']
    const rows = pors.map((p: any) => 
      `"${p.member ?? ''}","${p.org}","${p.por_type}","${p.region ?? ''}","${p.council_tier ?? ''}","${p.term}","${p.active ? 'Active' : 'Past'}"`
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + header.concat(rows).join('\\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'por_directory.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Admin"
        title="POR Directory"
        sub="View, search, and manage all Positions of Responsibility across Houses and organisations."
        right={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={exportCSV}>⬇ Export CSV</Button>
            <Button onClick={() => setShowPorModal(true)}>+ Authorize Role</Button>
          </div>
        }
      />

      {/* ---- COUNCIL OVERVIEW ---- */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {(['upper', 'lower'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setCouncilTab(t)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                councilTab === t
                  ? 'bg-teal/15 text-teal border border-teal/30'
                  : 'text-graytext-mid hover:text-offwhite hover:bg-white/5 border border-transparent'
              }`}
            >
              {t === 'upper' ? `Upper House Council (${upperCouncil.length})` : `Lower House Council (${lowerCouncil.length})`}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(councilTab === 'upper' ? upperCouncil : lowerCouncil).map((p: any) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/12 text-[12px] font-bold text-gold">
                  {(p.member ?? '?').split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-offwhite truncate">{p.member}</div>
                  <div className="text-caption text-graytext-light truncate">{p.org} · {p.por_type}</div>
                  {p.region && <div className="text-[11px] text-graytext-mid truncate">📍 {p.region}</div>}
                </div>
              </div>
            </Card>
          ))}
          {(councilTab === 'upper' ? upperCouncil : lowerCouncil).length === 0 && (
            <Card className="col-span-full p-8 text-center text-graytext-mid">
              No {councilTab === 'upper' ? 'Upper' : 'Lower'} House Council members assigned yet.
            </Card>
          )}
        </div>
      </div>

      {/* ---- SEARCH & FILTER BAR ---- */}
      <h3 className="mb-4 text-[16px] font-bold text-offwhite">Full Directory</h3>
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
          onChange={e => { setPorOrgFilter(e.target.value); setPorPage(1); }}
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
          onChange={e => { setPorStatusFilter(e.target.value); setPorPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="past">Past Only</option>
        </select>
      </div>

      {/* ---- TABLE ---- */}
      {isPaginatedLoading ? (
        <Card className="p-10 text-center text-graytext-light"><Loading label="Loading directory..." /></Card>
      ) : !paginatedPors || paginatedPors.items.length === 0 ? (
        <Card className="p-10 text-center text-graytext-light">No PORs assigned yet or matching filters.</Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] min-w-[800px]">
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
                {paginatedPors.items
                  .filter((p: any) => {
                    const matchName = !porSearch || (p.member ?? '').toLowerCase().includes(porSearch.toLowerCase())
                    const matchRole = !porRoleFilter || p.por_type === porRoleFilter
                    const matchRegion = !porRegionFilter || p.region === porRegionFilter
                    return matchName && matchRole && matchRegion
                  })
                  .map((p: any) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/12 text-[12px] font-bold text-gold">
                          {(p.member ?? '?').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className="text-offwhite font-medium">{p.member ?? '—'}</span>
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
          </div>
          {/* Pagination controls */}
          <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
            <span className="text-[13px] text-graytext-mid">
              Showing {((paginatedPors.page - 1) * paginatedPors.limit) + 1} to {Math.min(paginatedPors.page * paginatedPors.limit, paginatedPors.total)} of {paginatedPors.total} PORs
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={paginatedPors.page <= 1}
                onClick={() => setPorPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-[13px] font-medium text-offwhite px-2">Page {paginatedPors.page} of {paginatedPors.pages}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={paginatedPors.page >= paginatedPors.pages}
                onClick={() => setPorPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
      <p className="mt-3 text-caption text-graytext-mid">Past PORs preserved for historical record (P4).</p>

      {/* ---- DEACTIVATE CONFIRMATION MODAL ---- */}
      {confirmDeactivateId && confirmPor && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 bg-onyx">
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

      {/* ---- AUTHORIZE ROLE MODAL ---- */}
      {showPorModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 bg-onyx">
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
    </div>
  )
}
