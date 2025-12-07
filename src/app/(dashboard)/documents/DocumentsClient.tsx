'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Switch } from '@/components/ui/switch'
import {
  FileText,
  Plus,
  Download,
  Trash2,
  Eye,
  Loader2,
  FileImage,
  File,
  Send,
  Edit,
  Star,
  Check,
  Upload,
  X,
  ArrowLeft,
} from 'lucide-react'
import { TemplateEditor } from '@/components/template-editor/TemplateEditor'
import { sampleLoadData } from '@/lib/template-variables'

interface DocumentTemplate {
  id: string
  name: string
  type: string
  description: string | null
  html_content: string
  css_styles: string | null
  page_size: string
  page_orientation: string
  margin_top: number
  margin_right: number
  margin_bottom: number
  margin_left: number
  is_default: boolean
  is_active: boolean
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
  { value: 'bol', label: 'Bill of Lading' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'carrier_packet', label: 'Carrier Packet' },
  { value: 'custom', label: 'Custom' },
]

// Default rate confirmation template
const defaultRateConTemplate = `
<div style="text-align: center; margin-bottom: 20px;">
  <h1 style="color: #1e40af; margin: 0;">RATE CONFIRMATION</h1>
  <p style="margin: 5px 0;">{{broker.name}}</p>
  <p style="margin: 0; font-size: 12px;">{{broker.address}} • {{broker.city_state_zip}}</p>
  <p style="margin: 0; font-size: 12px;">MC# {{broker.mc}} • {{broker.phone}}</p>
</div>

<hr style="border: 1px solid #ddd; margin: 20px 0;">

<table style="width: 100%; margin-bottom: 20px;">
  <tr>
    <td style="width: 50%;"><strong>Load #:</strong> {{reference_number}}</td>
    <td style="width: 50%; text-align: right;"><strong>Date:</strong> {{current_date}}</td>
  </tr>
</table>

<h3 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">CARRIER INFORMATION</h3>
<table style="width: 100%; margin-bottom: 20px;">
  <tr>
    <td><strong>Carrier:</strong> {{carrier.company_name}}</td>
    <td><strong>MC#:</strong> {{carrier.mc_number}}</td>
    <td><strong>DOT#:</strong> {{carrier.dot_number}}</td>
  </tr>
  <tr>
    <td><strong>Contact:</strong> {{carrier.contact_name}}</td>
    <td colspan="2"><strong>Phone:</strong> {{carrier.contact_phone}}</td>
  </tr>
</table>

<div style="display: flex; gap: 20px; margin-bottom: 20px;">
  <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
    <h4 style="color: #16a34a; margin-top: 0;">PICKUP</h4>
    <p><strong>{{pickup_name}}</strong></p>
    <p>{{origin_address}}<br>{{pickup_city_state}}</p>
    <p><strong>Date:</strong> {{pickup_date}}<br><strong>Time:</strong> {{pickup_time}}</p>
    <p><strong>Contact:</strong> {{pickup_contact}}<br>{{pickup_phone}}</p>
  </div>
  <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
    <h4 style="color: #dc2626; margin-top: 0;">DELIVERY</h4>
    <p><strong>{{delivery_name}}</strong></p>
    <p>{{dest_address}}<br>{{delivery_city_state}}</p>
    <p><strong>Date:</strong> {{delivery_date}}<br><strong>Time:</strong> {{delivery_time}}</p>
    <p><strong>Contact:</strong> {{delivery_contact}}<br>{{delivery_phone}}</p>
  </div>
</div>

<h3 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">FREIGHT DETAILS</h3>
<table style="width: 100%; margin-bottom: 20px;">
  <tr>
    <td><strong>Commodity:</strong> {{commodity}}</td>
    <td><strong>Weight:</strong> {{weight}} lbs</td>
    <td><strong>Equipment:</strong> {{equipment_type}}</td>
  </tr>
</table>
<p><strong>Special Instructions:</strong><br>{{special_instructions}}</p>

<h3 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 5px;">RATE & PAYMENT</h3>
<table style="width: 100%; margin-bottom: 20px;">
  <tr>
    <td style="font-size: 18px;"><strong>Carrier Rate: {{carrier_rate}}</strong></td>
    <td><strong>Payment Terms:</strong> {{pay_terms}}</td>
    <td><strong>Freight Terms:</strong> {{freight_terms}}</td>
  </tr>
</table>

<div style="margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
  <h4>TERMS & CONDITIONS</h4>
  <ol style="font-size: 11px; color: #666;">
    <li>Carrier must call for check-calls as required.</li>
    <li>Driver must obtain signed POD with receiver's printed name, date, and time.</li>
    <li>Carrier is responsible for all cargo claims and must maintain proper insurance.</li>
    <li>All claims must be filed within 9 months of delivery date.</li>
    <li>Carrier agrees to the Broker-Carrier Agreement on file.</li>
  </ol>
</div>

<div style="margin-top: 40px; display: flex; gap: 40px;">
  <div style="flex: 1;">
    <p style="border-top: 1px solid #333; padding-top: 5px;">Carrier Signature / Date</p>
  </div>
  <div style="flex: 1;">
    <p style="border-top: 1px solid #333; padding-top: 5px;">Broker Signature / Date</p>
  </div>
</div>

<p style="text-align: center; font-size: 10px; color: #999; margin-top: 30px;">
  Generated: {{current_datetime}}
</p>
`

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

  // Template editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [templateName, setTemplateName] = useState('')
  const [templateType, setTemplateType] = useState('rate_confirmation')
  const [templateDescription, setTemplateDescription] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [cssStyles, setCssStyles] = useState('')
  const [pageSize, setPageSize] = useState('letter')
  const [pageOrientation, setPageOrientation] = useState('portrait')
  const [isDefault, setIsDefault] = useState(false)

  const [deleting, setDeleting] = useState<string | null>(null)

  // Service request state
  const [requestServiceOpen, setRequestServiceOpen] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestSending, setRequestSending] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [requestLogo, setRequestLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Template preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null)

  const resetForm = () => {
    setTemplateName('')
    setTemplateType('rate_confirmation')
    setTemplateDescription('')
    setHtmlContent('')
    setCssStyles('')
    setPageSize('letter')
    setPageOrientation('portrait')
    setIsDefault(false)
    setEditingTemplate(null)
  }

  const openNewTemplate = () => {
    resetForm()
    setHtmlContent(defaultRateConTemplate)
    setEditorOpen(true)
  }

  const useStandardTemplate = async () => {
    setSaving(true)
    try {
      const { error, data } = await supabase
        .from('document_templates')
        .insert({
          name: 'FreightFlow Standard Rate Confirmation',
          type: 'rate_confirmation',
          description: 'Professional rate confirmation template with all essential fields',
          html_content: defaultRateConTemplate,
          page_size: 'letter',
          page_orientation: 'portrait',
          is_default: true,
        })
        .select()
        .single()

      if (error) throw error

      // Show preview of the created template
      if (data) {
        setPreviewTemplate(data)
        setPreviewOpen(true)
      }

      router.refresh()
    } catch (error) {
      console.error('Error creating standard template:', error)
      alert('Error creating template')
    } finally {
      setSaving(false)
    }
  }

  const openPreview = (template: DocumentTemplate) => {
    setPreviewTemplate(template)
    setPreviewOpen(true)
  }

  const openEditTemplate = (template: DocumentTemplate) => {
    setEditingTemplate(template)
    setTemplateName(template.name)
    setTemplateType(template.type)
    setTemplateDescription(template.description || '')
    setHtmlContent(template.html_content)
    setCssStyles(template.css_styles || '')
    setPageSize(template.page_size)
    setPageOrientation(template.page_orientation)
    setIsDefault(template.is_default)
    setEditorOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateName || !htmlContent) return

    setSaving(true)
    try {
      const templateData = {
        name: templateName,
        type: templateType,
        description: templateDescription || null,
        html_content: htmlContent,
        css_styles: cssStyles || null,
        page_size: pageSize,
        page_orientation: pageOrientation,
        is_default: isDefault,
      }

      if (editingTemplate) {
        // Update existing
        const { error } = await supabase
          .from('document_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('document_templates')
          .insert(templateData)

        if (error) throw error
      }

      setEditorOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Error saving template')
    } finally {
      setSaving(false)
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

  const handleSetDefault = async (templateId: string, type: string) => {
    try {
      // The database trigger will handle unsetting other defaults
      const { error } = await supabase
        .from('document_templates')
        .update({ is_default: true })
        .eq('id', templateId)

      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Document Templates</h1>
          <p className="text-muted-foreground">
            Create and manage document templates with variable placeholders
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="recent">Recent Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <p className="text-sm text-muted-foreground">
              Design templates using the visual editor. Insert variables like {`{{reference_number}}`} that get replaced with load data.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRequestServiceOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Request Custom Design
              </Button>
              <Button onClick={openNewTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No templates yet</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                  Choose how you&apos;d like to set up your document templates.
                </p>

                <div className="grid gap-4 md:grid-cols-3 w-full max-w-3xl">
                  {/* Standard Template Option */}
                  <Card className="border-2 hover:border-blue-500 transition-colors cursor-pointer" onClick={useStandardTemplate}>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="font-medium mb-2">Use Standard Template</h4>
                      <p className="text-xs text-muted-foreground">
                        Get started instantly with FreightFlow&apos;s professional rate confirmation template
                      </p>
                      <Button className="mt-4 w-full" disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Use Standard'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Create Custom Option */}
                  <Card className="border-2 hover:border-green-500 transition-colors cursor-pointer" onClick={openNewTemplate}>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Edit className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className="font-medium mb-2">Create Your Own</h4>
                      <p className="text-xs text-muted-foreground">
                        Design a custom template with your branding using our visual editor
                      </p>
                      <Button variant="outline" className="mt-4 w-full">
                        Open Editor
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Request Design Option */}
                  <Card className="border-2 hover:border-purple-500 transition-colors cursor-pointer" onClick={() => setRequestServiceOpen(true)}>
                    <CardContent className="pt-6 text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Send className="h-6 w-6 text-purple-600" />
                      </div>
                      <h4 className="font-medium mb-2">White Glove Service</h4>
                      <p className="text-xs text-muted-foreground">
                        Let our team create professional templates matching your brand
                      </p>
                      <Button variant="outline" className="mt-4 w-full">
                        Request Design
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <p className="text-xs text-muted-foreground mt-6">
                  Tip: Use a desktop computer for the best template editing experience
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className={template.is_default ? 'ring-2 ring-blue-500' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {template.name}
                            {template.is_default && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                          </CardTitle>
                        </div>
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
                      {template.page_size} • {template.page_orientation} • Created {formatDate(template.created_at)}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openPreview(template)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditTemplate(template)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {!template.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(template.id, template.type)}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Set Default
                        </Button>
                      )}
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
      </Tabs>

      {/* Request Custom Design Service Dialog */}
      <Dialog open={requestServiceOpen} onOpenChange={(open) => {
        if (!open) {
          setRequestMessage('')
          setRequestSent(false)
          setRequestLogo(null)
          setLogoPreview(null)
        }
        setRequestServiceOpen(open)
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Custom Template Design</DialogTitle>
            <DialogDescription>
              Our design team can create professional, branded document templates for you.
            </DialogDescription>
          </DialogHeader>

          {requestSent ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Request Sent!</h3>
              <p className="text-sm text-muted-foreground text-center">
                We&apos;ll review your request and get back to you within 1-2 business days
                with pricing and timeline.
              </p>
              <Button className="mt-6" onClick={() => setRequestServiceOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">What&apos;s Included:</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Professional design matching your brand</li>
                  <li>• Rate Confirmation, BOL, Invoice templates</li>
                  <li>• All dynamic variables pre-configured</li>
                  <li>• Unlimited revisions until you&apos;re satisfied</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label>Your Company Logo</Label>
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-20 max-w-[200px] object-contain border rounded-lg p-2 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRequestLogo(null)
                        setLogoPreview(null)
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setRequestLogo(file)
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setLogoPreview(reader.result as string)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                      />
                    </label>
                    <span className="text-xs text-muted-foreground">PNG, JPG, or SVG</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tell us about your needs</Label>
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Describe the templates you need, any specific branding requirements, colors, fonts, examples you like, etc."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setRequestServiceOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setRequestSending(true)
                    try {
                      const formData = new FormData()
                      formData.append('message', requestMessage)
                      if (requestLogo) {
                        formData.append('logo', requestLogo)
                      }

                      const response = await fetch('/api/request-custom-design', {
                        method: 'POST',
                        body: formData
                      })
                      if (!response.ok) throw new Error('Failed to send request')
                      setRequestSent(true)
                    } catch (error) {
                      console.error('Error sending request:', error)
                      alert('Failed to send request. Please try again.')
                    } finally {
                      setRequestSending(false)
                    }
                  }}
                  disabled={requestSending}
                >
                  {requestSending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog - Full Screen */}
      <Dialog open={editorOpen} onOpenChange={(open) => {
        if (!open) resetForm()
        setEditorOpen(open)
      }}>
        <DialogContent fullScreen className="overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Design your document template using the visual editor. Use the "Insert Variable" button to add dynamic fields.
            </DialogDescription>
          </DialogHeader>

          {/* Mobile Warning */}
          <div className="lg:hidden bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Best on Desktop:</strong> The template editor works best on a larger screen. Consider using a desktop computer for the best experience.
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-4 flex-1 overflow-hidden">
            {/* Settings Panel */}
            <div className="space-y-4 overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Standard Rate Confirmation"
                />
              </div>

              <div className="space-y-2">
                <Label>Template Type *</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>Description</Label>
                <Textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Page Size</Label>
                  <Select value={pageSize} onValueChange={setPageSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select value={pageOrientation} onValueChange={setPageOrientation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Set as Default</Label>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              </div>

              <div className="space-y-2">
                <Label>Custom CSS (optional)</Label>
                <Textarea
                  value={cssStyles}
                  onChange={(e) => setCssStyles(e.target.value)}
                  placeholder=".custom-class { color: blue; }"
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Editor Panel */}
            <div className="lg:col-span-3 flex flex-col overflow-hidden">
              <TemplateEditor
                content={htmlContent}
                onChange={setHtmlContent}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateName || !htmlContent || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent fullScreen className="overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(false)}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview: {previewTemplate?.name}
                </DialogTitle>
                <DialogDescription>
                  This is how your template will look with sample data filled in. The actual document will use real load data.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <div
              className="bg-white mx-auto shadow-lg"
              style={{
                width: previewTemplate?.page_orientation === 'landscape' ? '11in' : '8.5in',
                minHeight: previewTemplate?.page_orientation === 'landscape' ? '8.5in' : '11in',
                padding: '0.75in',
                maxWidth: '100%',
              }}
            >
              {previewTemplate && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: previewTemplate.html_content.replace(
                      /\{\{([^}]+)\}\}/g,
                      (_, key) => {
                        const value = sampleLoadData[key.trim() as keyof typeof sampleLoadData]
                        return value !== undefined ? String(value) : `{{${key}}}`
                      }
                    ),
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t shrink-0">
            <div className="flex gap-2">
              <Badge variant="outline">
                {templateTypes.find((t) => t.value === previewTemplate?.type)?.label}
              </Badge>
              <Badge variant="outline">
                {previewTemplate?.page_size} • {previewTemplate?.page_orientation}
              </Badge>
              {previewTemplate?.is_default && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Star className="h-3 w-3 mr-1 fill-yellow-500" />
                  Default
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewOpen(false)
                  if (previewTemplate) {
                    openEditTemplate(previewTemplate)
                  }
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
              <Button onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
