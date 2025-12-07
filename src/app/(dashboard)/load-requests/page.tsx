import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Package, Clock, ArrowRight, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
}

export default async function LoadRequestsPage() {
  const supabase = await createClient()

  const { data: requests } = await supabase
    .from('load_requests')
    .select(`
      *,
      customer:customers(company_name)
    `)
    .order('created_at', { ascending: false })

  // Get counts by status
  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0
  const quotedCount = requests?.filter(r => r.status === 'quoted').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Load Requests
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Customer submitted load requests awaiting quotes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Quoted</p>
                <p className="text-2xl font-bold">{quotedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ArrowRight className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold">{requests?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="hidden md:table-cell">Pickup Date</TableHead>
                <TableHead className="hidden lg:table-cell">Equipment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests && requests.length > 0 ? (
                requests.map((request) => (
                  <TableRow key={request.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell className="font-medium">
                      <Link href={`/load-requests/${request.id}`} className="text-blue-600 hover:underline">
                        {request.reference_number || 'N/A'}
                      </Link>
                    </TableCell>
                    <TableCell>{request.customer?.company_name || 'Unknown'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{request.pickup_city}, {request.pickup_state}</div>
                        <div className="text-gray-400 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          {request.delivery_city}, {request.delivery_state}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {request.pickup_date
                        ? format(new Date(request.pickup_date), 'MMM d, yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {request.equipment_type || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[request.status] || 'bg-gray-100 text-gray-800'}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/load-requests/${request.id}`}>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No load requests yet. Requests will appear when customers submit them.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
