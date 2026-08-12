import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { Button } from './ui'
import AcademicStatusDialog from './AcademicStatusDialog'

export default function AcademicStatusBanner() {
  const { currentUser, capabilities } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('ekatva_ac_banner_dismissed')) {
      setDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('ekatva_ac_banner_dismissed', '1')
    setDismissed(true)
  }

  if (!currentUser || !currentUser?.academicStatusStale || dismissed) {
    return null
  }

  return (
    <>
      <div
        role="status"
        className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4 shadow-sm"
      >
        <div className="text-body text-gold/90">
          <strong>Confirm your academic status.</strong> Please verify your current academic level and status to keep your profile up to date.
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Not now
          </Button>
          <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
            Confirm status
          </Button>
        </div>
      </div>

      <AcademicStatusDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}
