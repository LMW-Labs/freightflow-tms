'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { LoadStatus, Load } from '@/lib/types/database'
import { MapPin, Truck } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const TrackingMap = dynamic(
  () => import('@/components/maps/TrackingMap').then((mod) => mod.TrackingMap),
  { ssr: false, loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" /> }
)

type LoadWithLocation = Load & {
  customer?: { company_name: string } | null
}

export default function LiveTrackingPage() {
  const supabase = createClient()
  const [loads, setLoads] = useState<LoadWithLocation[]>([])
  const [selectedLoad, setSelectedLoad] = useState<LoadWithLocation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch active loads with tracking
    const fetchLoads = async () => {
      const { data } = await supabase
        .from('loads')
        .select('*, customer:customers(company_name)')
        .not('status', 'in', '("delivered","invoiced","paid","quoted","booked")')
        .order('created_at', { ascending: false })

      setLoads(data || [])
      setLoading(false)
    }

    fetchLoads()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('live-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loads',
        },
        (payload) => {
          setLoads((current) =>
            current.map((load) =>
              load.id === payload.new.id
                ? { ...load, ...payload.new }
                : load
            )
          )
          if (selectedLoad?.id === payload.new.id) {
            setSelectedLoad((current) =>
              current ? { ...current, ...payload.new } : null
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedLoad?.id])

  const activeLoads = loads.filter((l) =>
    ['en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'at_delivery', 'dispatched'].includes(l.status)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Live Tracking
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Real-time view of all active shipments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              {selectedLoad ? (
                <TrackingMap
                  origin={
                    selectedLoad.origin_lat && selectedLoad.origin_lng
                      ? { lat: Number(selectedLoad.origin_lat), lng: Number(selectedLoad.origin_lng) }
                      : null
                  }
                  destination={
                    selectedLoad.dest_lat && selectedLoad.dest_lng
                      ? { lat: Number(selectedLoad.dest_lat), lng: Number(selectedLoad.dest_lng) }
                      : null
                  }
                  currentLocation={
                    selectedLoad.current_lat && selectedLoad.current_lng
                      ? { lat: Number(selectedLoad.current_lat), lng: Number(selectedLoad.current_lng) }
                      : null
                  }
                  className="h-full rounded-lg"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a load from the list to view tracking</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Load List */}
        <div>
          <Card className="h-[600px] overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Active Loads ({activeLoads.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[calc(100%-80px)]">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : activeLoads.length > 0 ? (
                <div className="space-y-3">
                  {activeLoads.map((load) => (
                    <div
                      key={load.id}
                      onClick={() => setSelectedLoad(load)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedLoad?.id === load.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          href={`/loads/${load.id}`}
                          className="font-medium text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {load.reference_number}
                        </Link>
                        <StatusBadge status={load.status as LoadStatus} />
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {load.origin_city}, {load.origin_state} → {load.dest_city}, {load.dest_state}
                      </p>
                      {load.customer && (
                        <p className="text-xs text-gray-400 mt-1">
                          {load.customer.company_name}
                        </p>
                      )}
                      {load.current_location_updated_at && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Live tracking active
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active loads in transit</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
