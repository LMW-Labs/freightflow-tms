import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Truck, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { LoadStatus } from '@/lib/types/database'
import { format } from 'date-fns'

interface PortalPageProps {
  params: Promise<{ slug: string }>
}

export default async function PortalPage({ params }: PortalPageProps) {
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

  // Get stats
  const { count: activeLoads } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .not('status', 'in', '("delivered","invoiced","paid")')

  const { count: inTransit } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .in('status', ['en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'at_delivery'])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: deliveredThisMonth } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .eq('status', 'delivered')
    .gte('updated_at', monthStart)

  // Get recent loads
  const { data: recentLoads } = await supabase
    .from('loads')
    .select('*')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { name: 'Active Shipments', value: activeLoads || 0, icon: Package, color: 'text-blue-600 bg-blue-100' },
    { name: 'In Transit', value: inTransit || 0, icon: Truck, color: 'text-orange-600 bg-orange-100' },
    { name: 'Delivered This Month', value: deliveredThisMonth || 0, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome, {customer.company_name}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Track your shipments and view delivery status
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Shipments</CardTitle>
          <Link
            href={`/portal/${slug}/loads`}
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentLoads && recentLoads.length > 0 ? (
            <div className="space-y-4">
              {recentLoads.map((load) => (
                <Link
                  key={load.id}
                  href={`/portal/${slug}/loads/${load.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-blue-600">
                        {load.reference_number}
                      </span>
                      <StatusBadge status={load.status as LoadStatus} />
                    </div>
                    <div className="mt-1 text-sm text-gray-500 truncate">
                      {load.origin_city}, {load.origin_state} → {load.dest_city}, {load.dest_state}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm text-gray-500">
                      {load.pickup_date
                        ? format(new Date(load.pickup_date), 'MMM d, yyyy')
                        : 'No date'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No shipments yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
