import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Button, Card, Input, SectionTitle, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'

export default function AdminSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings-points'],
    queryFn: () => api.adminSettingsPoints(),
  })

  const [points, setPoints] = useState({ attended: 30, organised: 50, volunteered: 20 })
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  useEffect(() => {
    if (data) {
      setPoints({
        attended: data.attended ?? 30,
        organised: data.organised ?? 50,
        volunteered: data.volunteered ?? 20,
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: (newPoints: typeof points) => api.adminUpdateSettingsPoints(newPoints),
    onSuccess: (updatedData) => {
      queryClient.setQueryData(['settings-points'], updatedData)
      addToast('Recognition points updated successfully')
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to update points', 'error')
    },
  })

  if (isLoading) return <Loading />
  if (error) return <ErrorState error={error} />

  return (
    <div>
      <SectionTitle
        eyebrow="System Configuration"
        title="Recognition Points"
        sub="Configure how many contribution points are awarded for different community actions. These values take effect immediately for all future actions."
      />
      <Card className="max-w-2xl p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate(points)
          }}
          className="space-y-6"
        >
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                Points for Attending
              </label>
              <Input
                type="number"
                min="0"
                value={points.attended}
                onChange={(e) => setPoints({ ...points, attended: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                Points for Organising
              </label>
              <Input
                type="number"
                min="0"
                value={points.organised}
                onChange={(e) => setPoints({ ...points, organised: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                Points for Volunteering
              </label>
              <Input
                type="number"
                min="0"
                value={points.volunteered}
                onChange={(e) => setPoints({ ...points, volunteered: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-white/5">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
