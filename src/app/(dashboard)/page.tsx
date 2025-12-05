import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Truck, Users, CheckCircle, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { LoadStatus } from '@/lib/types/database'
import { format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get stats
  const { count: activeLoads } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("delivered","invoiced","paid")')

  const { count: deliveredToday } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'delivered')
    .gte('updated_at', new Date().toISOString().split('T')[0])

  const { count: pendingPods } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'delivered')

  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  // Get recent loads
  const { data: recentLoads } = await supabase
    .from('loads')
    .select(`
      *,
      customer:customers(company_name),
      carrier:carriers(company_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = [
    {
      name: 'Active Loads',
      value: activeLoads || 0,
      icon: Package,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: 'Delivered Today',
      value: deliveredToday || 0,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
    },
    {
      name: 'Pending PODs',
      value: pendingPods || 0,
      icon: Truck,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      name: 'Total Customers',
      value: totalCustomers || 0,
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Welcome back! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard/loads/new">
              <Plus className="h-4 w-4 mr-2" />
              New Load
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Loads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Loads</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/loads">
              View all
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentLoads && recentLoads.length > 0 ? (
            <div className="space-y-4">
              {recentLoads.map((load) => (
                <Link
                  key={load.id}
                  href={`/dashboard/loads/${load.id}`}
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
                      {load.origin_city}, {load.origin_state} → {load.dest_city},{' '}
                      {load.dest_state}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium">
                      {load.customer?.company_name || 'No customer'}
                    </div>
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
              <p>No loads yet</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/loads/new">Create your first load</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
