import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { LoadStatus } from '@/lib/types/database'
import { format } from 'date-fns'

interface LoadsPageProps {
  searchParams: Promise<{ status?: string; search?: string }>
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
    query = query.ilike('reference_number', `%${params.search}%`)
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
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Loads
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage all your shipments in one place
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
            placeholder="Search by reference #..."
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

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Origin</TableHead>
              <TableHead className="hidden md:table-cell">Destination</TableHead>
              <TableHead className="hidden lg:table-cell">Pickup Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Carrier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loads && loads.length > 0 ? (
              loads.map((load) => (
                <TableRow key={load.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell>
                    <Link
                      href={`/loads/${load.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {load.reference_number}
                    </Link>
                  </TableCell>
                  <TableCell>{load.customer?.company_name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {load.origin_city}, {load.origin_state}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {load.dest_city}, {load.dest_state}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {load.pickup_date
                      ? format(new Date(load.pickup_date), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={load.status as LoadStatus} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {load.carrier?.company_name || '-'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {error ? 'Error loading loads' : 'No loads found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
