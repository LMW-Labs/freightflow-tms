'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Search,
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  Package,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { CreateInvoiceDialog } from './CreateInvoiceDialog'
import { InvoiceDetailSheet } from './InvoiceDetailSheet'
import { DocumentsTab } from './DocumentsTab'
import { Upload } from 'lucide-react'

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

export default function AccountingPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [readyLoads, setReadyLoads] = useState<LoadForInvoice[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    pendingAudit: 0,
    sentThisMonth: 0,
    paidThisMonth: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    // Fetch invoices
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select(`
        *,
        load:loads(reference_number, origin_city, origin_state, dest_city, dest_state),
        customer:customers(company_name),
        carrier:carriers(company_name, factoring_company, factoring_email)
      `)
      .order('created_at', { ascending: false })

    if (invoicesData) {
      setInvoices(invoicesData)

      // Calculate stats
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const outstanding = invoicesData
        .filter(i => ['pending_audit', 'audited', 'sent'].includes(i.status))
        .reduce((sum, i) => sum + (i.total || 0), 0)

      const pendingAudit = invoicesData.filter(i => i.status === 'pending_audit').length

      const sentThisMonth = invoicesData.filter(
        i => i.sent_at && new Date(i.sent_at) >= monthStart
      ).length

      const paidThisMonth = invoicesData
        .filter(i => i.paid_at && new Date(i.paid_at) >= monthStart)
        .reduce((sum, i) => sum + (i.total || 0), 0)

      setStats({
        totalOutstanding: outstanding,
        pendingAudit,
        sentThisMonth,
        paidThisMonth,
      })
    }

    // Fetch loads ready for invoicing (delivered but not yet invoiced)
    const { data: loadsData } = await supabase
      .from('loads')
      .select(`
        id, reference_number, customer_id, carrier_id,
        customer_rate, carrier_rate, origin_city, origin_state,
        dest_city, dest_state, status, rate_con_received,
        pod_received, carrier_invoice_received,
        customer:customers(company_name),
        carrier:carriers(company_name)
      `)
      .in('status', ['delivered', 'invoiced'])
      .order('created_at', { ascending: false })

    if (loadsData) {
      // Transform the data to match our interface
      const transformedLoads = loadsData.map((load: any) => ({
        id: load.id,
        reference_number: load.reference_number,
        customer_id: load.customer_id,
        carrier_id: load.carrier_id,
        customer_rate: load.customer_rate,
        carrier_rate: load.carrier_rate,
        origin_city: load.origin_city,
        origin_state: load.origin_state,
        dest_city: load.dest_city,
        dest_state: load.dest_state,
        status: load.status,
        rate_con_received: load.rate_con_received,
        pod_received: load.pod_received,
        carrier_invoice_received: load.carrier_invoice_received,
        customer: load.customer,
        carrier: load.carrier,
      }))
      setReadyLoads(transformedLoads)
    }

    setLoading(false)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      pending_audit: { label: 'Pending Audit', className: 'bg-yellow-100 text-yellow-700' },
      audited: { label: 'Audited', className: 'bg-blue-100 text-blue-700' },
      sent: { label: 'Sent', className: 'bg-purple-100 text-purple-700' },
      paid: { label: 'Paid', className: 'bg-green-100 text-green-700' },
      void: { label: 'Void', className: 'bg-red-100 text-red-700' },
    }
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.load?.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.carrier?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    const matchesType = typeFilter === 'all' || invoice.invoice_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Accounting
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage invoices, documents, and payments
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold">${stats.totalOutstanding.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Audit</p>
                <p className="text-2xl font-bold">{stats.pendingAudit}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent This Month</p>
                <p className="text-2xl font-bold">{stats.sentThisMonth}</p>
              </div>
              <Send className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold">${stats.paidThisMonth.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            All Invoices
          </TabsTrigger>
          <TabsTrigger value="ready">
            <Package className="h-4 w-4 mr-2" />
            Ready to Invoice ({readyLoads.filter(l => l.status === 'delivered').length})
          </TabsTrigger>
          <TabsTrigger value="audit">
            <CheckCircle className="h-4 w-4 mr-2" />
            Pending Audit ({stats.pendingAudit})
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Upload className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* All Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_audit">Pending Audit</SelectItem>
                <SelectItem value="audited">Audited</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="carrier">Carrier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Load #</th>
                  <th className="px-4 py-3 text-left font-semibold">Customer/Carrier</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-blue-600">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">
                          {invoice.invoice_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {invoice.load?.reference_number || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {invoice.invoice_type === 'customer'
                          ? invoice.customer?.company_name
                          : invoice.carrier?.company_name}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${invoice.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(invoice.invoice_date), 'MM/dd/yy')}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Ready to Invoice Tab */}
        <TabsContent value="ready" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loads Ready for Invoicing</CardTitle>
              <CardDescription>
                Delivered loads with documents ready for invoice creation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Load #</th>
                      <th className="px-4 py-3 text-left font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold">Carrier</th>
                      <th className="px-4 py-3 text-left font-semibold">Route</th>
                      <th className="px-4 py-3 text-center font-semibold">RC</th>
                      <th className="px-4 py-3 text-center font-semibold">POD</th>
                      <th className="px-4 py-3 text-center font-semibold">CI</th>
                      <th className="px-4 py-3 text-right font-semibold">Cust Rate</th>
                      <th className="px-4 py-3 text-right font-semibold">Car Rate</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {readyLoads
                      .filter(l => l.status === 'delivered')
                      .map((load) => (
                        <tr key={load.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 font-medium text-blue-600">
                            {load.reference_number}
                          </td>
                          <td className="px-4 py-3">
                            {load.customer?.company_name || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {load.carrier?.company_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {load.origin_city}, {load.origin_state} → {load.dest_city}, {load.dest_state}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {load.rate_con_received ? (
                              <CheckCircle className="h-4 w-4 text-green-500 inline" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-300 inline" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {load.pod_received ? (
                              <CheckCircle className="h-4 w-4 text-green-500 inline" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-300 inline" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {load.carrier_invoice_received ? (
                              <CheckCircle className="h-4 w-4 text-green-500 inline" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-300 inline" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${load.customer_rate?.toLocaleString() || '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${load.carrier_rate?.toLocaleString() || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                // Will open create dialog with load pre-selected
                                setCreateDialogOpen(true)
                              }}
                            >
                              Create Invoice
                            </Button>
                          </td>
                        </tr>
                      ))}
                    {readyLoads.filter(l => l.status === 'delivered').length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                          No loads ready for invoicing
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices Pending Audit</CardTitle>
              <CardDescription>
                Review documents and approve invoices before sending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Invoice #</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Load #</th>
                      <th className="px-4 py-3 text-left font-semibold">Customer/Carrier</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold">Created</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices
                      .filter(i => i.status === 'pending_audit')
                      .map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 font-medium text-blue-600">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize">
                              {invoice.invoice_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {invoice.load?.reference_number || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {invoice.invoice_type === 'customer'
                              ? invoice.customer?.company_name
                              : invoice.carrier?.company_name}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ${invoice.total.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {format(new Date(invoice.created_at), 'MM/dd/yy HH:mm')}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              Audit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    {invoices.filter(i => i.status === 'pending_audit').length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No invoices pending audit
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        loads={readyLoads}
        onCreated={fetchData}
      />

      {/* Invoice Detail Sheet */}
      {selectedInvoice && (
        <InvoiceDetailSheet
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
          onUpdated={fetchData}
        />
      )}
    </div>
  )
}
