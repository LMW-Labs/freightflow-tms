'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, FileText, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface LoadForInvoice {
  id: string
  reference_number: string
  customer_id: string | null
  carrier_id: string | null
  customer_rate: number | null
  carrier_rate: number | null
  origin_city: string | null
  origin_state: string | null
  dest_city: string | null
  dest_state: string | null
  status: string
  rate_con_received: boolean
  pod_received: boolean
  carrier_invoice_received: boolean
  customer?: { company_name: string }
  carrier?: { company_name: string }
}

interface Document {
  id: string
  type: string
  file_name: string
  file_url: string
}

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

interface CreateInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loads: LoadForInvoice[]
  onCreated: () => void
  preselectedLoadId?: string
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  loads,
  onCreated,
  preselectedLoadId,
}: CreateInvoiceDialogProps) {
  const supabase = createClient()
  const [creating, setCreating] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)

  const [invoiceType, setInvoiceType] = useState<'customer' | 'carrier'>('customer')
  const [selectedLoadId, setSelectedLoadId] = useState<string>(preselectedLoadId || '')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dueDate, setDueDate] = useState('')
  const [sendToEmail, setSendToEmail] = useState('')
  const [sendToType, setSendToType] = useState<string>('customer')

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: 'Freight Charges', quantity: 1, unit_price: 0 },
  ])

  const [loadDocuments, setLoadDocuments] = useState<Document[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])

  // Generate invoice number on mount
  useEffect(() => {
    const prefix = invoiceType === 'customer' ? 'INV' : 'CAR'
    const dateStr = format(new Date(), 'yyyyMMdd')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setInvoiceNumber(`${prefix}-${dateStr}-${random}`)
  }, [invoiceType])

  // Fetch documents when load is selected
  useEffect(() => {
    if (selectedLoadId) {
      fetchLoadDocuments()
      populateFromLoad()
    }
  }, [selectedLoadId, invoiceType])

  const fetchLoadDocuments = async () => {
    setLoadingDocs(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('load_id', selectedLoadId)
      .order('created_at', { ascending: false })

    if (data) {
      setLoadDocuments(data)
      // Auto-select relevant documents based on invoice type
      const relevantTypes = invoiceType === 'customer'
        ? ['pod', 'bol', 'rate_con']
        : ['carrier_invoice', 'pod', 'rate_con']
      const autoSelect = data
        .filter(d => relevantTypes.includes(d.type))
        .map(d => d.id)
      setSelectedDocIds(autoSelect)
    }
    setLoadingDocs(false)
  }

  const populateFromLoad = () => {
    const load = loads.find(l => l.id === selectedLoadId)
    if (load) {
      const rate = invoiceType === 'customer' ? load.customer_rate : load.carrier_rate
      setLineItems([
        {
          description: `Freight Charges - ${load.reference_number}: ${load.origin_city}, ${load.origin_state} to ${load.dest_city}, ${load.dest_state}`,
          quantity: 1,
          unit_price: rate || 0,
        },
      ])

      // Set send-to email based on type
      if (invoiceType === 'customer') {
        setSendToType('customer')
      } else {
        // For carrier invoice, might send to factoring company
        setSendToType('carrier')
      }
    }
  }

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }])
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    if (field === 'description') {
      updated[index].description = value as string
    } else {
      updated[index][field] = Number(value) || 0
    }
    setLineItems(updated)
  }

  const toggleDocument = (docId: string) => {
    setSelectedDocIds(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    )
  }

  const handleCreate = async () => {
    if (!selectedLoadId) {
      toast.error('Please select a load')
      return
    }

    if (!invoiceNumber) {
      toast.error('Invoice number is required')
      return
    }

    setCreating(true)

    try {
      const load = loads.find(l => l.id === selectedLoadId)
      if (!load) throw new Error('Load not found')

      // Get organization ID
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user?.id)
        .single()

      const subtotal = calculateTotal()

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          organization_id: userData?.organization_id,
          load_id: selectedLoadId,
          customer_id: invoiceType === 'customer' ? load.customer_id : null,
          carrier_id: invoiceType === 'carrier' ? load.carrier_id : null,
          invoice_number: invoiceNumber,
          invoice_type: invoiceType,
          status: 'pending_audit',
          subtotal,
          total: subtotal,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          send_to_email: sendToEmail || null,
          send_to_type: sendToType,
          created_by: user?.id,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create line items
      if (invoice) {
        const lineItemsData = lineItems.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
          sort_order: index,
        }))

        await supabase.from('invoice_line_items').insert(lineItemsData)

        // Link documents
        const docsData = selectedDocIds.map((docId, index) => {
          const doc = loadDocuments.find(d => d.id === docId)
          return {
            invoice_id: invoice.id,
            document_id: docId,
            document_type: doc?.type || 'other',
            file_url: doc?.file_url || '',
            file_name: doc?.file_name || '',
            sort_order: index,
            included_in_package: true,
          }
        })

        if (docsData.length > 0) {
          await supabase.from('invoice_documents').insert(docsData)
        }

        // Add history entry
        await supabase.from('invoice_history').insert({
          invoice_id: invoice.id,
          action: 'created',
          new_status: 'pending_audit',
          notes: `Invoice created for load ${load.reference_number}`,
          performed_by: user?.id,
        })

        // Update load status to invoiced
        await supabase
          .from('loads')
          .update({ status: 'invoiced' })
          .eq('id', selectedLoadId)
      }

      toast.success('Invoice created successfully')
      onCreated()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error('Error creating invoice:', error)
      toast.error('Failed to create invoice')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setSelectedLoadId('')
    setInvoiceNumber('')
    setLineItems([{ description: 'Freight Charges', quantity: 1, unit_price: 0 }])
    setLoadDocuments([])
    setSelectedDocIds([])
    setSendToEmail('')
  }

  const selectedLoad = loads.find(l => l.id === selectedLoadId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Invoice
          </DialogTitle>
          <DialogDescription>
            Generate an invoice from load data with attached documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invoice Type & Load Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Type</Label>
              <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as 'customer' | 'carrier')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer Invoice (Broker Invoice)</SelectItem>
                  <SelectItem value="carrier">Carrier Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Load</Label>
              <Select value={selectedLoadId} onValueChange={setSelectedLoadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a load..." />
                </SelectTrigger>
                <SelectContent>
                  {loads.map((load) => (
                    <SelectItem key={load.id} value={load.id}>
                      {load.reference_number} - {load.customer?.company_name || 'No customer'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedLoad && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm">
              <p className="font-medium">{selectedLoad.reference_number}</p>
              <p className="text-gray-500">
                {selectedLoad.origin_city}, {selectedLoad.origin_state} → {selectedLoad.dest_city}, {selectedLoad.dest_state}
              </p>
              <p className="text-gray-500">
                Customer: {selectedLoad.customer?.company_name || '-'} | Carrier: {selectedLoad.carrier?.company_name || '-'}
              </p>
            </div>
          )}

          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                    className="w-28"
                  />
                  <div className="w-24 text-right font-medium pt-2">
                    ${(item.quantity * item.unit_price).toLocaleString()}
                  </div>
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">${calculateTotal().toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Document Selection */}
          {selectedLoadId && (
            <div className="space-y-4">
              <Label>Attach Documents</Label>
              {loadingDocs ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading documents...
                </div>
              ) : loadDocuments.length > 0 ? (
                <div className="space-y-2">
                  {loadDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Checkbox
                        checked={selectedDocIds.includes(doc.id)}
                        onCheckedChange={() => toggleDocument(doc.id)}
                      />
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{doc.file_name}</p>
                        <p className="text-xs text-gray-500 capitalize">{doc.type.replace('_', ' ')}</p>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No documents found for this load</p>
              )}
            </div>
          )}

          {/* Send To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Send To Type</Label>
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
              <Label>Send To Email</Label>
              <Input
                type="email"
                value={sendToEmail}
                onChange={(e) => setSendToEmail(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !selectedLoadId}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Invoice'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
