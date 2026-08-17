import { useState } from 'react'
import { Dialog, Select, Button } from './ui'
import { useConfirmAcademicStatus } from '../lib/queries'
import { useToast } from './ui'

export default function AcademicStatusDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const [level, setLevel] = useState('foundation')
  const [status, setStatus] = useState('active')
  const confirmMutation = useConfirmAcademicStatus()
  const { addToast } = useToast()

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync({ academicLevel: level, academicStatus: status })
      addToast('Academic status confirmed successfully.')
      onClose()
    } catch (e: any) {
      addToast(e.message || 'Failed to confirm status.', 'error')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Confirm Academic Status">
      <div className="space-y-4">
        <p className="text-[13px] text-graytext-light">
          To ensure our records are accurate for the current term, please select your academic level and status.
        </p>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-graytext-mid">
            Academic Level
          </label>
          <Select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            options={[
              { label: 'Foundation', value: 'foundation' },
              { label: 'Diploma', value: 'diploma' },
              { label: 'Degree', value: 'degree' }
            ]}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-graytext-mid">
            Current Status
          </label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'On Break', value: 'on_break' },
              { label: 'Withdrawn', value: 'withdrawn' }
            ]}
          />
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={confirmMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
            {confirmMutation.isPending ? 'Confirming...' : 'Confirm Status'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
