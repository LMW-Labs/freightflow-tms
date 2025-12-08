'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  Upload,
  FileText,
  Play,
  CheckCircle,
  Clock,
  Search,
  Eye,
  Trash2,
  Package,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Document {
  id: string
  load_id: string | null
  type: string
  file_name: string
  file_url: string
  file_size: number | null
  created_at: string
  processing_status?: string
  processed_at?: string
  load?: {
    reference_number: string
    customer?: { company_name: string }
    carrier?: { company_name: string }
  }
}

interface Load {
  id: string
  reference_number: string
  customer?: { company_name: string }
  carrier?: { company_name: string }
}

export function DocumentsTab() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loads, setLoads] = useState<Load[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedLoadId, setSelectedLoadId] = useState('')
  const [docType, setDocType] = useState('pod')

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    // Fetch documents with load info
    const { data: docs } = await supabase
      .from('documents')
      .select(`
        *,
        load:loads(
          reference_number,
          customer:customers(company_name),
          carrier:carriers(company_name)
        )
      `)
      .order('created_at', { ascending: false })

    if (docs) {
      setDocuments(docs)
    }

    // Fetch loads for the dropdown
    const { data: loadsData } = await supabase
      .from('loads')
      .select(`
        id,
        reference_number,
        customer:customers(company_name),
        carrier:carriers(company_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (loadsData) {
      // Transform the data to match our interface (Supabase returns single objects, not arrays, for single relations)
      const transformedLoads = loadsData.map((load: any) => ({
        id: load.id,
        reference_number: load.reference_number,
        customer: load.customer,
        carrier: load.carrier,
      }))
      setLoads(transformedLoads)
    }

    setLoading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadDialogOpen(true)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser()

      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${selectedFile.name}`
      const filePath = `documents/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          load_id: selectedLoadId || null,
          type: docType,
          file_name: selectedFile.name,
          file_url: publicUrl,
          file_size: selectedFile.size,
          uploaded_by_type: 'broker',
          uploaded_by_id: user?.id,
        })

      if (dbError) throw dbError

      // Update load document flags if applicable
      if (selectedLoadId) {
        const updateField = docType === 'pod' ? 'pod_received'
          : docType === 'rate_con' ? 'rate_con_received'
          : docType === 'invoice' ? 'carrier_invoice_received'
          : null

        if (updateField) {
          await supabase
            .from('loads')
            .update({ [updateField]: true })
            .eq('id', selectedLoadId)
        }
      }

      toast.success('Document uploaded successfully')
      fetchData()
      setUploadDialogOpen(false)
      setSelectedFile(null)
      setSelectedLoadId('')
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleStartProcessing = async () => {
    if (!selectedDocument) return

    setProcessing(true)

    try {
      // Simulate processing - in real implementation this would:
      // 1. OCR the document
      // 2. Extract key data
      // 3. Match to load/invoice
      // 4. Create invoice if needed

      // For now, just update status
      await supabase
        .from('documents')
        .update({
          // These fields would be added in a real implementation
          // processing_status: 'processed',
          // processed_at: new Date().toISOString(),
        })
        .eq('id', selectedDocument.id)

      toast.success('Document processing started')
      setDetailDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error processing document:', error)
      toast.error('Failed to process document')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      toast.success('Document deleted')
      fetchData()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Failed to delete document')
    }
  }

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rate_con: 'Rate Confirmation',
      bol: 'Bill of Lading',
      pod: 'Proof of Delivery',
      invoice: 'Carrier Invoice',
      other: 'Other',
    }
    return labels[type] || type
  }

  const getDocTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      rate_con: 'bg-blue-100 text-blue-700',
      bol: 'bg-purple-100 text-purple-700',
      pod: 'bg-green-100 text-green-700',
      invoice: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700',
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.load?.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.load?.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = typeFilter === 'all' || doc.type === typeFilter

    return matchesSearch && matchesType
  })

  // Separate documents by processing status
  const pendingDocs = filteredDocuments.filter(d => !d.load_id)
  const processedDocs = filteredDocuments.filter(d => d.load_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Upload carrier invoices, PODs, BOLs and other documents for processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </Button>
            <p className="text-sm text-muted-foreground">
              Supported: PDF, JPG, PNG, DOC, DOCX
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="rate_con">Rate Confirmation</SelectItem>
            <SelectItem value="bol">Bill of Lading</SelectItem>
            <SelectItem value="pod">Proof of Delivery</SelectItem>
            <SelectItem value="invoice">Carrier Invoice</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents to be Processed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Documents to be Processed ({pendingDocs.length})
          </CardTitle>
          <CardDescription>
            Documents not yet linked to a load
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDocs.length > 0 ? (
            <div className="space-y-2">
              {pendingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium">{doc.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getDocTypeBadgeColor(doc.type)}>
                          {getDocTypeLabel(doc.type)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(doc.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                        {doc.file_size && (
                          <span className="text-xs text-gray-500">
                            {(doc.file_size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(doc)
                        setDetailDialogOpen(true)
                      }}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Process
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              No documents pending processing
            </p>
          )}
        </CardContent>
      </Card>

      {/* Processed Documents History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Processed Documents ({processedDocs.length})
          </CardTitle>
          <CardDescription>
            Documents linked to loads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Document</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Load #</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Uploaded</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {processedDocs.length > 0 ? (
                  processedDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="truncate max-w-[200px]">{doc.file_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getDocTypeBadgeColor(doc.type)}>
                          {getDocTypeLabel(doc.type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-medium">
                        {doc.load?.reference_number || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {doc.load?.customer?.company_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(doc.created_at), 'MM/dd/yy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No processed documents
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add details for the document you're uploading
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileText className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pod">Proof of Delivery (POD)</SelectItem>
                  <SelectItem value="invoice">Carrier Invoice</SelectItem>
                  <SelectItem value="rate_con">Rate Confirmation</SelectItem>
                  <SelectItem value="bol">Bill of Lading (BOL)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link to Load (Optional)</Label>
              <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a load..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No load (process later)</SelectItem>
                  {loads.map((load) => (
                    <SelectItem key={load.id} value={load.id}>
                      {load.reference_number} - {load.customer?.company_name || 'No customer'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If you don't link to a load now, you can process it later
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Detail / Processing Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              Review document and link to a load for processing
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4 py-4">
              {/* Document Preview Link */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-10 w-10 text-gray-400" />
                  <div>
                    <p className="font-medium">{selectedDocument.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getDocTypeBadgeColor(selectedDocument.type)}>
                        {getDocTypeLabel(selectedDocument.type)}
                      </Badge>
                      {selectedDocument.file_size && (
                        <span className="text-sm text-gray-500">
                          {(selectedDocument.file_size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <a href={selectedDocument.file_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    View Document
                  </a>
                </Button>
              </div>

              {/* Link to Load */}
              <div className="space-y-2">
                <Label>Link to Load</Label>
                <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a load to link..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loads.map((load) => (
                      <SelectItem key={load.id} value={load.id}>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>{load.reference_number}</span>
                          <span className="text-gray-500">-</span>
                          <span className="text-gray-500">{load.customer?.company_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Type */}
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pod">Proof of Delivery (POD)</SelectItem>
                    <SelectItem value="invoice">Carrier Invoice</SelectItem>
                    <SelectItem value="rate_con">Rate Confirmation</SelectItem>
                    <SelectItem value="bol">Bill of Lading (BOL)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedDocument || !selectedLoadId) {
                  toast.error('Please select a load')
                  return
                }

                setProcessing(true)
                try {
                  // Update document with load link
                  await supabase
                    .from('documents')
                    .update({
                      load_id: selectedLoadId,
                      type: docType,
                    })
                    .eq('id', selectedDocument.id)

                  // Update load document flags
                  const updateField = docType === 'pod' ? 'pod_received'
                    : docType === 'rate_con' ? 'rate_con_received'
                    : docType === 'invoice' ? 'carrier_invoice_received'
                    : null

                  if (updateField) {
                    await supabase
                      .from('loads')
                      .update({ [updateField]: true })
                      .eq('id', selectedLoadId)
                  }

                  toast.success('Document processed and linked to load')
                  setDetailDialogOpen(false)
                  setSelectedLoadId('')
                  fetchData()
                } catch (error) {
                  console.error('Error processing document:', error)
                  toast.error('Failed to process document')
                } finally {
                  setProcessing(false)
                }
              }}
              disabled={processing || !selectedLoadId}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Process Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
