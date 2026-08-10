import { useState, useEffect } from 'react'
import { useFilteredUsers, useUpdateAcademicStatus } from '../lib/queries'
import { SectionTitle, Card, Badge, Button, Input, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'

export default function Users() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [level, setLevel] = useState('')
  const [status, setStatus] = useState('')
  const [city, setCity] = useState('')

  const [editingUser, setEditingUser] = useState<any>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(timer)
  }, [q])

  const { data: users, isLoading, error } = useFilteredUsers(debouncedQ, {
    academic_level: level || undefined,
    academic_status: status || undefined,
    city: city || undefined,
  })

  if (isLoading) return <Loading />
  if (error) return <ErrorState error={error as Error} />

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Members"
        sub="Manage user directory and override academic status."
      />

      <Card className="p-4 flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search by name or email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
        >
          <option value="">All Levels</option>
          <option value="Foundation">Foundation</option>
          <option value="Diploma">Diploma</option>
          <option value="Degree">Degree</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="On-Break">On-Break</option>
          <option value="Withdrawn">Withdrawn</option>
        </select>
        <Input
          placeholder="Filter by city..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full md:w-48"
        />
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-white/5 text-graytext-mid">
            <tr>
              <th className="px-5 py-4 font-medium">Name</th>
              <th className="px-5 py-4 font-medium">Email</th>
              <th className="px-5 py-4 font-medium">City</th>
              <th className="px-5 py-4 font-medium">Academic Level</th>
              <th className="px-5 py-4 font-medium">Academic Status</th>
              <th className="px-5 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-offwhite">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-4 font-medium">{user.name}</td>
                <td className="px-5 py-4 text-graytext-light">{user.email}</td>
                <td className="px-5 py-4">{user.city}</td>
                <td className="px-5 py-4">
                  <Badge tone="teal">{user.academic_level || 'N/A'}</Badge>
                </td>
                <td className="px-5 py-4">
                  <Badge
                    tone={
                      user.academic_status === 'Active' ? 'success' :
                      user.academic_status === 'On-Break' ? 'warn' :
                      user.academic_status === 'Withdrawn' ? 'danger' : 'neutral'
                    }
                  >
                    {user.academic_status || 'N/A'}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-graytext-mid">
                  No users found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {editingUser && (
        <EditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  )
}

function EditModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [level, setLevel] = useState(user.academic_level || '')
  const [status, setStatus] = useState(user.academic_status || '')
  const updateStatus = useUpdateAcademicStatus()
  const { addToast } = useToast()

  const handleSave = () => {
    updateStatus.mutate(
      { userId: user.id, payload: { academic_level: level, academic_status: status } },
      {
        onSuccess: () => {
          addToast('Status updated', 'success')
          onClose()
        },
        onError: (err: any) => addToast(err.message || 'Update failed', 'error')
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md p-6 bg-onyx border-white/10 shadow-2xl">
        <h2 className="text-h3 font-bold text-gold mb-4">Edit Academic Status</h2>
        <div className="text-body text-graytext-light mb-6">
          Updating status for <strong className="text-offwhite">{user.name}</strong>.
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-caption text-graytext-mid mb-1">Academic Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
            >
              <option value="">Unknown</option>
              <option value="Foundation">Foundation</option>
              <option value="Diploma">Diploma</option>
              <option value="Degree">Degree</option>
            </select>
          </div>
          
          <div>
            <label className="block text-caption text-graytext-mid mb-1">Academic Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite focus:border-teal focus:outline-none"
            >
              <option value="">Unknown</option>
              <option value="Active">Active</option>
              <option value="On-Break">On-Break</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
