import React, { useState } from 'react'
import Papa from 'papaparse'
import { createPortal } from 'react-dom'
import { cx } from '../lib/format'
import { Card, Button } from './ui'
import { api } from '../lib/api'

interface BulkAssignModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function BulkAssignModal({ onClose, onSuccess }: BulkAssignModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
      setPreviewData([])
    }
  }

  const handlePreview = async () => {
    if (!file) return
    setIsUploading(true)
    setError('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res: any = await api.bulkPreviewPors(results.data)
          if (Array.isArray(res)) {
            setPreviewData(res)
          } else {
            setError(res.error || 'Failed to generate preview.')
          }
        } catch (err: any) {
          setError(err.message || 'An error occurred during preview.')
        } finally {
          setIsUploading(false)
        }
      },
      error: (err: any) => {
        setError(err.message)
        setIsUploading(false)
      }
    })
  }

  const handleConfirm = async () => {
    const validRows = previewData.filter(d => d.status === 'valid').map(d => d.data)
    if (validRows.length === 0) {
      setError('No valid rows to assign.')
      return
    }

    setIsUploading(true)
    setError('')
    try {
      const res: any = await api.bulkAssignPors(validRows)
      if (Array.isArray(res)) {
        onSuccess()
      } else {
        setError(res.error || 'Failed to bulk assign.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during assignment.')
    } finally {
      setIsUploading(false)
    }
  }

  const hasErrors = previewData.some(d => d.status === 'error')
  const validCount = previewData.filter(d => d.status === 'valid').length

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/75 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
        <h3 className="mb-1 text-[18px] font-bold text-offwhite">Bulk Assign PORs</h3>
        <p className="mb-4 text-caption text-graytext-light">
          Upload a CSV to assign roles in bulk. Columns required: Email, Organisation Type, Organisation Name, Position, Term. Region is optional.
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-4 items-center mb-6">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            className="text-[13px] text-graytext-mid file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-white/10 file:text-offwhite hover:file:bg-white/20"
          />
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handlePreview} 
            disabled={!file || isUploading}
          >
            {isUploading && previewData.length === 0 ? 'Loading...' : 'Generate Preview'}
          </Button>
        </div>

        {previewData.length > 0 && (
          <div className="flex-1 overflow-auto border border-white/10 rounded-xl mb-4">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-white/5 border-b border-white/10 text-graytext-mid sticky top-0">
                <tr>
                  <th className="p-3 font-semibold">Row</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Org</th>
                  <th className="p-3 font-semibold">Position</th>
                  <th className="p-3 font-semibold">Region</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="p-3 text-graytext-light">{row.row}</td>
                    <td className="p-3 text-offwhite">{row.data.Email}</td>
                    <td className="p-3 text-offwhite">{row.data['Organisation Name']} <span className="text-graytext-dark">({row.data['Organisation Type']})</span></td>
                    <td className="p-3 text-offwhite">{row.data.Position}</td>
                    <td className="p-3 text-offwhite">{row.data.Region || '-'}</td>
                    <td className="p-3">
                      {row.status === 'valid' ? (
                        <span className="text-teal font-medium">Valid</span>
                      ) : (
                        <div className="text-red-400 font-medium">
                          {row.errors.map((e: string, j: number) => <div key={j}>{e}</div>)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {previewData.length > 0 && (
            <Button 
              variant={hasErrors ? 'secondary' : 'primary'} 
              onClick={handleConfirm}
              disabled={isUploading || validCount === 0}
            >
              {isUploading && previewData.length > 0 ? 'Assigning...' : `Confirm & Assign ${validCount} Roles`}
            </Button>
          )}
        </div>
      </Card>
    </div>,
    document.body
  )
}
