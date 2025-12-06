import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Check, X, MapPin } from 'lucide-react'
import Link from 'next/link'
import { LoadStatus } from '@/lib/types/database'
import { format } from 'date-fns'

interface LoadsPageProps {
  searchParams: Promise<{ status?: string; search?: string }>
}

// Status badge with abbreviated codes
function StatusCode({ status }: { status: LoadStatus }) {
  const statusMap: Record<LoadStatus, { code: string; color: string }> = {
    quoted: { code: 'QTD', color: 'bg-gray-100 text-gray-700' },
    booked: { code: 'BKD', color: 'bg-blue-100 text-blue-700' },
    dispatched: { code: 'DSP', color: 'bg-purple-100 text-purple-700' },
    en_route_pickup: { code: 'ERP', color: 'bg-yellow-100 text-yellow-700' },
    at_pickup: { code: 'APU', color: 'bg-orange-100 text-orange-700' },
    loaded: { code: 'LDD', color: 'bg-cyan-100 text-cyan-700' },
    en_route_delivery: { code: 'ERD', color: 'bg-yellow-100 text-yellow-700' },
    at_delivery: { code: 'ADL', color: 'bg-orange-100 text-orange-700' },
    delivered: { code: 'DLV', color: 'bg-green-100 text-green-700' },
    invoiced: { code: 'INV', color: 'bg-indigo-100 text-indigo-700' },
    paid: { code: 'PAID', color: 'bg-emerald-100 text-emerald-700' },
    complete: { code: 'COMP', color: 'bg-green-200 text-green-800' },
    customer_paid: { code: 'CUPD', color: 'bg-emerald-200 text-emerald-800' },
  }

  const { code, color } = statusMap[status] || { code: status, color: 'bg-gray-100 text-gray-700' }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {code}
    </span>
  )
}

// Document check indicator
function DocCheck({ received }: { received: boolean }) {
  return received ? (
    <Check className="h-4 w-4 text-green-600" />
  ) : (
    <X className="h-4 w-4 text-gray-300" />
  )
}

export default async function LoadsPage({ searchParams }: LoadsPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('loads')
    .select(`
      *,
      customer:customers(company_name),
      carrier:carriers(company_name)
    `)
    .order('created_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  if (params.search) {
    query = query.or(`reference_number.ilike.%${params.search}%,pro_number.ilike.%${params.search}%,po_number.ilike.%${params.search}%`)
  }

  const { data: loads, error } = await query

  const statuses: { value: string; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
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
    { value: 'complete', label: 'Complete' },
    { value: 'customer_paid', label: 'Customer Paid' },
  ]

  // Format time for display
  const formatTime = (time: string | null) => {
    if (!time) return '-'
    try {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    } catch {
      return time
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Loads
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {loads?.length || 0} loads found
          </p>
        </div>
        <Button asChild>
          <Link href="/loads/new">
            <Plus className="h-4 w-4 mr-2" />
            New Load
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            name="search"
            placeholder="Search Load #, PRO #, PO #..."
            defaultValue={params.search}
            className="pl-10"
          />
        </form>
        <form>
          <Select name="status" defaultValue={params.status || 'all'}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>
      </div>

      {/* Table - Horizontal scroll on mobile */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Load #</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Status</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Booked</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">PU Name</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Pickup</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">PU Date</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">PU Time</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">DO Name</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Drop Off</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">DO Date</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">DO Time</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                <MapPin className="h-4 w-4 inline" />
              </th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Carrier</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Equip</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Hauler</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">PRO #</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">PO #</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">BOL #</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">CAR Rate</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap" title="Rate Confirmation">RC</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap" title="Proof of Delivery">POD</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap" title="Carrier Invoice">CI</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Rep 1</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Rep 2</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loads && loads.length > 0 ? (
              loads.map((load) => (
                <tr key={load.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/loads/${load.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {load.reference_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <StatusCode status={load.status as LoadStatus} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.booked_date
                      ? format(new Date(load.booked_date), 'MM/dd/yy')
                      : load.created_at
                      ? format(new Date(load.created_at), 'MM/dd/yy')
                      : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100 max-w-[120px] truncate" title={load.pickup_name || load.customer?.company_name || ''}>
                    {load.pickup_name || load.customer?.company_name || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.origin_city && load.origin_state
                      ? `${load.origin_city}, ${load.origin_state}`
                      : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.pickup_date
                      ? format(new Date(load.pickup_date), 'MM/dd/yy')
                      : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {formatTime(load.pickup_time_start)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100 max-w-[120px] truncate" title={load.delivery_name || ''}>
                    {load.delivery_name || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.dest_city && load.dest_state
                      ? `${load.dest_city}, ${load.dest_state}`
                      : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.delivery_date
                      ? format(new Date(load.delivery_date), 'MM/dd/yy')
                      : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {formatTime(load.delivery_time_start)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {load.tracking_token ? (
                      <Link
                        href={`/track/${load.tracking_token}`}
                        className="text-blue-600 hover:text-blue-800"
                        title="View tracking"
                      >
                        <MapPin className="h-4 w-4 inline" />
                      </Link>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100 max-w-[100px] truncate" title={load.carrier?.company_name || ''}>
                    {load.carrier?.company_name || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.equipment_code || load.equipment_type?.substring(0, 4) || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400 max-w-[80px] truncate" title={load.hauler_name || ''}>
                    {load.hauler_name || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.pro_number || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.po_number || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {load.bol_number || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-gray-900 dark:text-gray-100 font-medium">
                    {load.carrier_rate
                      ? `$${load.carrier_rate.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <DocCheck received={load.rate_con_received || false} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <DocCheck received={load.pod_received || false} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <DocCheck received={load.carrier_invoice_received || false} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400 max-w-[80px] truncate" title={load.sales_rep_1 || ''}>
                    {load.sales_rep_1 || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400 max-w-[80px] truncate" title={load.sales_rep_2 || ''}>
                    {load.sales_rep_2 || '-'}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      load.load_type === 'LTL'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {load.load_type || 'TL'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={25} className="text-center py-8 text-gray-500">
                  {error ? 'Error loading loads' : 'No loads found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
