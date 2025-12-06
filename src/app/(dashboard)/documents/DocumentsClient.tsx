'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Upload,
  Plus,
  Download,
  Trash2,
  Eye,
  Loader2,
  FileImage,
  File,
  Send,
} from 'lucide-react'

interface DocumentTemplate {
  id: string
  name: string
  type: string
  file_name: string
  file_url: string
  description: string | null
  created_at: string
}

interface RecentDocument {
  id: string
  type: string
  file_name: string
  file_url: string
  file_size: number | null
  created_at: string
  load?: {
    id: string
    reference_number: string
  } | null
}

interface DocumentsClientProps {
  templates: DocumentTemplate[]
  recentDocuments: RecentDocument[]
}

const templateTypes = [
  { value: 'rate_confirmation', label: 'Rate Confirmation' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'carrier_packet', label: 'Carrier Packet' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'pod_request', label: 'POD Request Form' },
  { value: 'other', label: 'Other' },
]

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return <FileImage className="h-4 w-4" />
  }
  if (ext === 'pdf') {
    return <FileText className="h-4 w-4 text-red-500" />
  }
  return <File className="h-4 w-4" />
}

export function DocumentsClient({ templates, recentDocuments }: DocumentsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateType, setTemplateType] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleUploadTemplate = async () => {
    if (!file || !templateName || !templateType) return

    setUploading(true)
    try {
      // Upload to Supabase Storage
      const fileName = `templates/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Create template record
      const { error: insertError } = await supabase.from('document_templates').insert({
        name: templateName,
        type: templateType,
        file_name: file.name,
        file_url: publicUrl,
        description: templateDescription || null,
      })

      if (insertError) throw insertError

      // Reset form
      setFile(null)
      setTemplateName('')
      setTemplateType('')
      setTemplateDescription('')
      setUploadOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error uploading template:', error)
      alert('Error uploading template')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    setDeleting(templateId)
    try {
      const { error } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error deleting template')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-muted-foreground">
            Manage document templates and view uploaded documents
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="recent">Recent Documents</TabsTrigger>
          <TabsTrigger value="driver-requests">Driver Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Upload document templates for rate confirmations, BOLs, invoices, and more.
              These templates can be used to prefill documents with load data.
            </p>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document Template</DialogTitle>
                  <DialogDescription>
                    Upload a template file that can be used to generate documents for loads.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Standard Rate Confirmation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template Type</Label>
                    <Select value={templateType} onValueChange={setTemplateType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {templateTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Brief description of when to use this template"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template File</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported: PDF, Word, Excel
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!file || !templateName || !templateType || uploading}
                    onClick={handleUploadTemplate}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your first document template to get started.
                </p>
                <Button onClick={() => setUploadOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(template.file_name)}
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">
                        {templateTypes.find((t) => t.value === template.type)?.label || template.type}
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      {template.file_name} • Uploaded {formatDate(template.created_at)}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={template.file_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={template.file_url} download>
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        disabled={deleting === template.id}
                      >
                        {deleting === template.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            View all documents uploaded across loads.
          </p>

          {recentDocuments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <File className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                <p className="text-sm text-muted-foreground">
                  Documents will appear here as they are uploaded to loads.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Load</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.file_name)}
                          <span className="font-medium">{doc.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {doc.type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.load ? (
                          <a
                            href={`/loads/${doc.load.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {doc.load.reference_number}
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>{formatDate(doc.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.file_url} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="driver-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Driver Document Requests</CardTitle>
              <CardDescription>
                Send requests to drivers for document uploads and digital signatures.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-2">How it works:</h4>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li>Select a load and the documents you need from the driver</li>
                  <li>Send a request via SMS or email with a secure upload link</li>
                  <li>Driver opens the link on their phone and uploads photos</li>
                  <li>Documents are automatically attached to the load</li>
                  <li>For digital signatures, driver signs on their device and IP is recorded</li>
                </ol>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" disabled>
                  <Send className="h-4 w-4 mr-2" />
                  Send Document Request (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
