import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Truck, CheckCircle, ArrowRight, MapPin, Clock, Sparkles, Plus } from 'lucide-react'
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
    .select('*, organization:organizations(*)')
    .eq('slug', slug)
    .single()

  if (!customer) {
    notFound()
  }

  const org = customer.organization
  const primaryColor = org?.primary_color || '#3B82F6'

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

  // Get load currently in transit for highlight
  const { data: activeInTransit } = await supabase
    .from('loads')
    .select('*')
    .eq('customer_id', customer.id)
    .in('status', ['en_route_pickup', 'en_route_delivery'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const stats = [
    { name: 'Active Shipments', value: activeLoads || 0, icon: Package, color: 'text-blue-600 bg-blue-100' },
    { name: 'In Transit', value: inTransit || 0, icon: Truck, color: 'text-orange-600 bg-orange-100' },
    { name: 'Delivered This Month', value: deliveredThisMonth || 0, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  ]

  // Get greeting based on time of day
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8">
      {/* Personalized Welcome Banner */}
      <div
        className="rounded-2xl p-8 text-white relative overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <Sparkles className="w-full h-full" />
        </div>
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium mb-1">{greeting}</p>
          <h1 className="text-3xl font-bold mb-2">
            Hello {customer.contact_name?.split(' ')[0] || customer.company_name}!
          </h1>
          <p className="text-white/90 text-lg">
            Welcome to your customized FreightFlow portal.
          </p>
          {customer.contact_name && (
            <p className="text-white/70 text-sm mt-2">
              {customer.company_name}
            </p>
          )}
          <Link
            href={`/portal/${slug}/request-load`}
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Request a Load
          </Link>
        </div>
      </div>

      {/* Live Tracking Highlight */}
      {activeInTransit && (
        <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Truck className="h-6 w-6 text-orange-600 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-orange-600">LIVE TRACKING</span>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                </div>
                <p className="font-bold text-lg">{activeInTransit.reference_number}</p>
                <p className="text-gray-600 text-sm">
                  {activeInTransit.origin_city}, {activeInTransit.origin_state} → {activeInTransit.dest_city}, {activeInTransit.dest_state}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    ETA: {activeInTransit.delivery_date
                      ? format(new Date(activeInTransit.delivery_date), 'MMM d')
                      : 'Calculating...'}
                  </span>
                  {activeInTransit.current_lat && activeInTransit.current_lng && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <MapPin className="h-4 w-4" />
                      GPS Active
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/portal/${slug}/loads/${activeInTransit.id}`}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                Track Now
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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
