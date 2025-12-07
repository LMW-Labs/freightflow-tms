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
import { Textarea } from '@/components/ui/textarea'
import { Edit, Upload, Loader2, Send, Copy, Check, ExternalLink, FileUp, FileText } from 'lucide-react'
import { Load, LoadStatus, DocumentType } from '@/lib/types/database'

const driverRequestTypes = [
  { value: 'pod', label: 'Proof of Delivery (POD)' },
  { value: 'bol', label: 'Bill of Lading (BOL)' },
  { value: 'rate_con', label: 'Rate Confirmation' },
  { value: 'signature', label: 'Digital Signature' },
  { value: 'other', label: 'Other Document' },
]

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
  const [shipperOpen, setShipperOpen] = useState(false)
  const [driverRequestOpen, setDriverRequestOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [driverLinkCopied, setDriverLinkCopied] = useState(false)
  const [docType, setDocType] = useState<DocumentType>('pod')
  const [file, setFile] = useState<File | null>(null)
  const [driverRequestType, setDriverRequestType] = useState('pod')
  const [driverMessage, setDriverMessage] = useState('')
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [driverUploadUrl, setDriverUploadUrl] = useState<string | null>(null)

  const shipperUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/shipper/${load.tracking_token}`
    : `/shipper/${load.tracking_token}`

  const copyShipperLink = async () => {
    try {
      await navigator.clipboard.writeText(shipperUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const copyDriverLink = async () => {
    if (!driverUploadUrl) return
    try {
      await navigator.clipboard.writeText(driverUploadUrl)
      setDriverLinkCopied(true)
      setTimeout(() => setDriverLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleCreateDriverRequest = async () => {
    setCreatingRequest(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('driver_document_requests')
        .insert({
          load_id: load.id,
          driver_id: load.driver_id,
          request_type: driverRequestType,
          message: driverMessage || null,
          requested_by_id: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      const url = typeof window !== 'undefined'
        ? `${window.location.origin}/driver-upload/${data.request_token}`
        : `/driver-upload/${data.request_token}`

      setDriverUploadUrl(url)
    } catch (error) {
      console.error('Error creating request:', error)
      alert('Error creating driver request')
    } finally {
      setCreatingRequest(false)
    }
  }

  const resetDriverRequest = () => {
    setDriverUploadUrl(null)
    setDriverMessage('')
    setDriverRequestType('pod')
  }

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

  const rateConUrl = `/api/rate-con?load_id=${load.id}`

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Rate Con Button */}
      <Button variant="outline" asChild>
        <a href={rateConUrl} target="_blank" rel="noopener noreferrer">
          <FileText className="h-4 w-4 mr-2" />
          Rate Con
        </a>
      </Button>

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

      {/* Send to Shipper */}
      <Dialog open={shipperOpen} onOpenChange={setShipperOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Send className="h-4 w-4 mr-2" />
            Send to Shipper
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Load with Shipper</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Share this link with the shipper to give them access to load details and tracking information.
            </p>

            <div className="space-y-2">
              <Label>Shipper Link</Label>
              <div className="flex gap-2">
                <Input
                  value={shipperUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyShipperLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={copyShipperLink}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                asChild
              >
                <a href={shipperUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Preview
                </a>
              </Button>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Load: {load.reference_number} | Token: {load.tracking_token.slice(0, 8)}...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request from Driver */}
      <Dialog open={driverRequestOpen} onOpenChange={(open) => {
        setDriverRequestOpen(open)
        if (!open) resetDriverRequest()
      }}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FileUp className="h-4 w-4 mr-2" />
            Request from Driver
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Document from Driver</DialogTitle>
          </DialogHeader>
          {!driverUploadUrl ? (
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Generate a secure upload link for the driver to submit documents or signatures.
              </p>

              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={driverRequestType} onValueChange={setDriverRequestType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {driverRequestTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message for Driver (optional)</Label>
                <Textarea
                  value={driverMessage}
                  onChange={(e) => setDriverMessage(e.target.value)}
                  placeholder="Any special instructions..."
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleCreateDriverRequest}
                disabled={creatingRequest}
              >
                {creatingRequest ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4 mr-2" />
                )}
                Generate Upload Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Upload link created!
                </p>
              </div>

              <div className="space-y-2">
                <Label>Driver Upload Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={driverUploadUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyDriverLink}
                  >
                    {driverLinkCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={copyDriverLink}
                >
                  {driverLinkCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a href={driverUploadUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview
                  </a>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Send this link to the driver via SMS or email.
                <br />
                Link expires in 7 days.
              </p>

              <Button
                variant="ghost"
                className="w-full"
                onClick={resetDriverRequest}
              >
                Create Another Request
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
