'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  FileText,
  CheckCircle,
  Send,
  Download,
  ExternalLink,
  Clock,
  AlertCircle,
  XCircle,
  Mail,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoice_number: string
  invoice_type: 'customer' | 'carrier'
  status: string
  subtotal: number
  total: number
  invoice_date: string
  due_date: string | null
  sent_at: string | null
  paid_at: string | null
  audited_at: string | null
  audit_notes: string | null
  load_id: string | null
  customer_id: string | null
  carrier_id: string | null
  send_to_email: string | null
  send_to_type: string | null
  package_url: string | null
  created_at: string
  load?: {
    reference_number: string
    origin_city: string | null
    origin_state: string | null
    dest_city: string | null
    dest_state: string | null
  }
  customer?: {
    company_name: string
  }
  carrier?: {
    company_name: string
    factoring_company: string | null
    factoring_email: string | null
  }
}

interface InvoiceDocument {
  id: string
  document_type: string
  file_name: string
  file_url: string
  included_in_package: boolean
}

interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface InvoiceHistory {
  id: string
  action: string
  old_status: string | null
  new_status: string | null
  notes: string | null
  performed_at: string
  performed_by: string | null
}

interface InvoiceDetailSheetProps {
  invoice: Invoice
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function InvoiceDetailSheet({
  invoice,
  open,
  onOpenChange,
  onUpdated,
}: InvoiceDetailSheetProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<InvoiceDocument[]>([])
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [history, setHistory] = useState<InvoiceHistory[]>([])

  const [auditNotes, setAuditNotes] = useState('')
  const [sendToEmail, setSendToEmail] = useState(invoice.send_to_email || '')
  const [sendToType, setSendToType] = useState(invoice.send_to_type || 'customer')

  const [auditing, setAuditing] = useState(false)
  const [sending, setSending] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)

  useEffect(() => {
    if (open) {
      fetchDetails()
    }
  }, [open, invoice.id])

  const fetchDetails = async () => {
    setLoading(true)

    // Fetch documents
    const { data: docs } = await supabase
      .from('invoice_documents')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order')

    if (docs) setDocuments(docs)

    // Fetch line items
    const { data: items } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order')

    if (items) setLineItems(items)

    // Fetch history
    const { data: hist } = await supabase
      .from('invoice_history')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('performed_at', { ascending: false })

    if (hist) setHistory(hist)

    setLoading(false)
  }

  const handleAudit = async (approved: boolean) => {
    setAuditing(true)
    const { data: { user } } = await supabase.auth.getUser()

    try {
      const newStatus = approved ? 'audited' : 'draft'

      await supabase
        .from('invoices')
        .update({
          status: newStatus,
          audited_by: user?.id,
          audited_at: new Date().toISOString(),
          audit_notes: auditNotes,
        })
        .eq('id', invoice.id)

      await supabase.from('invoice_history').insert({
        invoice_id: invoice.id,
        action: approved ? 'approved' : 'rejected',
        old_status: invoice.status,
        new_status: newStatus,
        notes: auditNotes || (approved ? 'Invoice approved' : 'Invoice rejected'),
        performed_by: user?.id,
      })

      toast.success(approved ? 'Invoice approved!' : 'Invoice sent back to draft')
      onUpdated()
    } catch (error) {
      console.error('Error auditing invoice:', error)
      toast.error('Failed to update invoice')
    } finally {
      setAuditing(false)
    }
  }

  const handleSend = async () => {
    if (!sendToEmail) {
      toast.error('Please enter an email address')
      return
    }

    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()

    try {
      // Call API to send invoice email
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          email: sendToEmail,
          sendToType,
          documentUrls: documents.filter(d => d.included_in_package).map(d => d.file_url),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send invoice')
      }

      // Update invoice status
      await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          send_to_email: sendToEmail,
          send_to_type: sendToType,
        })
        .eq('id', invoice.id)

      await supabase.from('invoice_history').insert({
        invoice_id: invoice.id,
        action: 'sent',
        old_status: invoice.status,
        new_status: 'sent',
        notes: `Invoice sent to ${sendToEmail}`,
        performed_by: user?.id,
      })

      toast.success('Invoice sent successfully!')
      onUpdated()
    } catch (error) {
      console.error('Error sending invoice:', error)
      toast.error('Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  const handleMarkPaid = async () => {
    setMarkingPaid(true)
    const { data: { user } } = await supabase.auth.getUser()

    try {
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      // Update load status
      if (invoice.load_id) {
        await supabase
          .from('loads')
          .update({ status: 'paid' })
          .eq('id', invoice.load_id)
      }

      await supabase.from('invoice_history').insert({
        invoice_id: invoice.id,
        action: 'marked_paid',
        old_status: invoice.status,
        new_status: 'paid',
        notes: 'Invoice marked as paid',
        performed_by: user?.id,
      })

      toast.success('Invoice marked as paid!')
      onUpdated()
    } catch (error) {
      console.error('Error marking invoice paid:', error)
      toast.error('Failed to update invoice')
    } finally {
      setMarkingPaid(false)
    }
  }

  const handleVoid = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    try {
      await supabase
        .from('invoices')
        .update({ status: 'void' })
        .eq('id', invoice.id)

      await supabase.from('invoice_history').insert({
        invoice_id: invoice.id,
        action: 'voided',
        old_status: invoice.status,
        new_status: 'void',
        notes: 'Invoice voided',
        performed_by: user?.id,
      })

      toast.success('Invoice voided')
      onUpdated()
    } catch (error) {
      console.error('Error voiding invoice:', error)
      toast.error('Failed to void invoice')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-5 w-5 text-gray-500" />
      case 'pending_audit':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'audited':
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case 'sent':
        return <Send className="h-5 w-5 text-purple-500" />
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'void':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      broker_invoice: 'Broker Invoice',
      carrier_invoice: 'Carrier Invoice',
      pod: 'Proof of Delivery',
      bol: 'Bill of Lading',
      rate_con: 'Rate Confirmation',
      other: 'Other Document',
    }
    return labels[type] || type
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            {getStatusIcon(invoice.status)}
            <div>
              <SheetTitle>{invoice.invoice_number}</SheetTitle>
              <SheetDescription>
                {invoice.invoice_type === 'customer' ? 'Customer Invoice' : 'Carrier Invoice'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-6">
            {/* Invoice Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Load</span>
                <span className="font-medium">{invoice.load?.reference_number || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {invoice.invoice_type === 'customer' ? 'Customer' : 'Carrier'}
                </span>
                <span className="font-medium">
                  {invoice.invoice_type === 'customer'
                    ? invoice.customer?.company_name
                    : invoice.carrier?.company_name}
                </span>
              </div>
              {invoice.load && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Route</span>
                  <span className="text-sm">
                    {invoice.load.origin_city}, {invoice.load.origin_state} → {invoice.load.dest_city}, {invoice.load.dest_state}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Date</span>
                <span>{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${invoice.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <Label>Line Items</Label>
              <div className="border rounded-lg">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex justify-between p-3 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} x ${item.unit_price.toLocaleString()}
                      </p>
                    </div>
                    <span className="font-medium">${item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attached Documents */}
            <div className="space-y-2">
              <Label>Attached Documents ({documents.length})</Label>
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{doc.file_name}</p>
                          <p className="text-xs text-gray-500">{getDocTypeLabel(doc.document_type)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.included_in_package && (
                          <Badge variant="outline" className="text-xs">
                            In Package
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No documents attached</p>
              )}
            </div>

            {/* Audit Section (for pending_audit status) */}
            {invoice.status === 'pending_audit' && (
              <div className="space-y-4 p-4 border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <Label className="text-yellow-800 dark:text-yellow-200">Audit Required</Label>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Review all documents and line items before approving this invoice.
                </p>
                <div className="space-y-2">
                  <Label>Audit Notes</Label>
                  <Textarea
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Add any notes about this invoice..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => handleAudit(true)}
                    disabled={auditing}
                  >
                    {auditing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAudit(false)}
                    disabled={auditing}
                  >
                    Reject & Send Back
                  </Button>
                </div>
              </div>
            )}

            {/* Send Section (for audited status) */}
            {invoice.status === 'audited' && (
              <div className="space-y-4 p-4 border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <Label className="text-blue-800 dark:text-blue-200">Ready to Send</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Send To</Label>
                    <Select value={sendToType} onValueChange={setSendToType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="factoring">Factoring Company</SelectItem>
                        <SelectItem value="carrier">Carrier</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={sendToEmail}
                      onChange={(e) => setSendToEmail(e.target.value)}
                      placeholder="recipient@example.com"
                    />
                  </div>
                </div>
                {invoice.carrier?.factoring_email && sendToType === 'factoring' && (
                  <p className="text-sm text-blue-600">
                    Factoring company email: {invoice.carrier.factoring_email}
                  </p>
                )}
                <Button onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send Invoice
                </Button>
              </div>
            )}

            {/* Mark Paid Section (for sent status) */}
            {invoice.status === 'sent' && (
              <div className="space-y-4 p-4 border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <Label className="text-purple-800 dark:text-purple-200">Awaiting Payment</Label>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Sent to {invoice.send_to_email} on {format(new Date(invoice.sent_at!), 'MMM dd, yyyy')}
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleMarkPaid} disabled={markingPaid}>
                    {markingPaid ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Mark as Paid
                  </Button>
                  <Button variant="outline" onClick={() => handleSend()}>
                    Resend
                  </Button>
                </div>
              </div>
            )}

            {/* Paid Status */}
            {invoice.status === 'paid' && (
              <div className="p-4 border-2 border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 dark:text-green-200 font-medium">Paid</span>
                  <span className="text-green-600 text-sm">
                    on {format(new Date(invoice.paid_at!), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            )}

            {/* History */}
            <div className="space-y-2">
              <Label>History</Label>
              <div className="space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5" />
                    <div>
                      <p className="font-medium capitalize">{entry.action.replace('_', ' ')}</p>
                      {entry.notes && <p className="text-gray-500">{entry.notes}</p>}
                      <p className="text-xs text-gray-400">
                        {format(new Date(entry.performed_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {!['paid', 'void'].includes(invoice.status) && (
              <div className="flex justify-end pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={handleVoid}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Void Invoice
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
