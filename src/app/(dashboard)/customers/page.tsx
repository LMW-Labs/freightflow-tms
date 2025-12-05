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
import { Badge } from '@/components/ui/badge'
import { Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { InviteCustomerUserDialog } from './InviteCustomerUserDialog'

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('company_name')

  // Get load counts for each customer
  const customerIds = customers?.map((c) => c.id) || []
  const { data: loadCounts } = await supabase
    .from('loads')
    .select('customer_id')
    .in('customer_id', customerIds)

  const loadCountMap: Record<string, number> = {}
  loadCounts?.forEach((l) => {
    if (l.customer_id) {
      loadCountMap[l.customer_id] = (loadCountMap[l.customer_id] || 0) + 1
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Customers
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your shippers and their portal access
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customers/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead>Portal</TableHead>
              <TableHead className="hidden lg:table-cell"># Loads</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers && customers.length > 0 ? (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.company_name}
                  </TableCell>
                  <TableCell>{customer.contact_name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {customer.contact_email || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {customer.contact_phone || '-'}
                  </TableCell>
                  <TableCell>
                    {customer.portal_enabled ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {loadCountMap[customer.id] || 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <InviteCustomerUserDialog
                        customerId={customer.id}
                        customerName={customer.company_name}
                      />
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/portal/${customer.slug}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No customers yet. Add your first customer to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
