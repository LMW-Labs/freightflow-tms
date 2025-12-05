import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function CarriersPage() {
  const supabase = await createClient()

  const { data: carriers } = await supabase
    .from('carriers')
    .select(`
      *,
      drivers(count)
    `)
    .order('company_name')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Carriers
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your trucking partners
          </p>
        </div>
        <Button asChild>
          <Link href="/carriers/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Carrier
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>MC Number</TableHead>
              <TableHead className="hidden md:table-cell">DOT Number</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Drivers</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carriers && carriers.length > 0 ? (
              carriers.map((carrier) => (
                <TableRow key={carrier.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell className="font-medium">
                    <Link href={`/carriers/${carrier.id}`} className="text-blue-600 hover:underline">
                      {carrier.company_name}
                    </Link>
                  </TableCell>
                  <TableCell>{carrier.mc_number || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {carrier.dot_number || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {carrier.contact_name || '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {(carrier.drivers as { count: number }[])?.[0]?.count || 0} drivers
                  </TableCell>
                  <TableCell>
                    <Link href={`/carriers/${carrier.id}`}>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No carriers yet. Add your first carrier to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
