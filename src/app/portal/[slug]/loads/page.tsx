import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { LoadStatus } from '@/lib/types/database'
import { format } from 'date-fns'

interface PortalLoadsPageProps {
  params: Promise<{ slug: string }>
}

export default async function PortalLoadsPage({ params }: PortalLoadsPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!customer) {
    notFound()
  }

  const { data: loads } = await supabase
    .from('loads')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your Shipments
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          View and track all your shipments
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference #</TableHead>
              <TableHead className="hidden md:table-cell">Origin</TableHead>
              <TableHead className="hidden md:table-cell">Destination</TableHead>
              <TableHead className="hidden lg:table-cell">Pickup Date</TableHead>
              <TableHead className="hidden lg:table-cell">Delivery Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loads && loads.length > 0 ? (
              loads.map((load) => (
                <TableRow
                  key={load.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <TableCell>
                    <Link
                      href={`/portal/${slug}/loads/${load.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {load.reference_number}
                    </Link>
                  </TableCell>
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
                  <TableCell className="hidden lg:table-cell">
                    {load.delivery_date
                      ? format(new Date(load.delivery_date), 'MMM d, yyyy')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={load.status as LoadStatus} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No shipments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
