'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, Upload, Loader2 } from 'lucide-react'
import { Load, LoadStatus, DocumentType } from '@/lib/types/database'

const statuses: { value: LoadStatus; label: string }[] = [
  { value: 'quoted', label: 'Quoted' },
  { value: 'booked', label: 'Booked' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'en_route_pickup', label: 'En Route to Pickup' },
  { value: 'at_pickup', label: 'At Pickup' },
  { value: 'loaded', label: 'Loaded' },
  { value: 'en_route_delivery', label: 'En Route to Delivery' },
  { value: 'at_delivery', label: 'At Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'paid', label: 'Paid' },
]

const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'rate_con', label: 'Rate Confirmation' },
  { value: 'bol', label: 'Bill of Lading' },
  { value: 'pod', label: 'Proof of Delivery' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
]

interface LoadActionsProps {
  load: Load
}

export function LoadActions({ load }: LoadActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [docType, setDocType] = useState<DocumentType>('pod')
  const [file, setFile] = useState<File | null>(null)

  const handleStatusChange = async (newStatus: LoadStatus) => {
    setUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Update load status
      await supabase
        .from('loads')
        .update({ status: newStatus })
        .eq('id', load.id)

      // Add to status history
      await supabase.from('status_history').insert({
        load_id: load.id,
        status: newStatus,
        created_by_type: 'broker',
        created_by_id: user?.id,
      })

      router.refresh()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      // Upload to Supabase Storage
      const fileName = `${load.id}/${docType}_${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Create document record
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('documents').insert({
        load_id: load.id,
        type: docType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        uploaded_by_type: 'broker',
        uploaded_by_id: user?.id,
      })

      setFile(null)
      setUploadOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Error uploading document')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status Dropdown */}
      <Select
        value={load.status}
        onValueChange={(v) => handleStatusChange(v as LoadStatus)}
        disabled={updating}
      >
        <SelectTrigger className="w-48">
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Upload Document */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!file || uploading}
              onClick={handleUpload}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Button */}
      <Button variant="outline" asChild>
        <a href={`/loads/${load.id}/edit`}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </a>
      </Button>
    </div>
  )
}
