'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Navigation,
  Camera,
  Clock,
  Truck,
  CheckCircle,
  Play,
  Square,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { LoadStatus } from '@/lib/types/database'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'

const TrackingMap = dynamic(
  () => import('@/components/maps/TrackingMap').then((mod) => mod.TrackingMap),
  { ssr: false, loading: () => <div className="h-48 bg-gray-200 animate-pulse rounded-lg" /> }
)

// Status flow for driver
const driverStatusFlow: { status: LoadStatus; label: string; nextLabel: string }[] = [
  { status: 'dispatched', label: 'Dispatched', nextLabel: 'Start Tracking' },
  { status: 'en_route_pickup', label: 'En Route to Pickup', nextLabel: 'Arrived at Pickup' },
  { status: 'at_pickup', label: 'At Pickup', nextLabel: 'Loaded' },
  { status: 'loaded', label: 'Loaded', nextLabel: 'Departed Pickup' },
  { status: 'en_route_delivery', label: 'En Route to Delivery', nextLabel: 'Arrived at Delivery' },
  { status: 'at_delivery', label: 'At Delivery', nextLabel: 'Delivered' },
  { status: 'delivered', label: 'Delivered', nextLabel: 'Complete' },
]

export default function DriverHomePage() {
  const supabase = createClient()
  const [driverPhone, setDriverPhone] = useState<string | null>(null)
  const [load, setLoad] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Check for stored driver session
  useEffect(() => {
    const stored = localStorage.getItem('driver_phone')
    if (stored) {
      setDriverPhone(stored)
    } else {
      setLoading(false)
    }
  }, [])

  // Fetch active load for driver
  useEffect(() => {
    if (!driverPhone) return

    const fetchLoad = async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('phone', driverPhone)
        .single()

      if (!driver) {
        setLoading(false)
        return
      }

      const { data: activeLoad } = await supabase
        .from('loads')
        .select('*')
        .eq('driver_id', driver.id)
        .not('status', 'in', '("delivered","invoiced","paid")')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setLoad(activeLoad)
      setLoading(false)

      // Auto-start tracking if en route
      if (activeLoad && ['en_route_pickup', 'en_route_delivery'].includes(activeLoad.status)) {
        startTracking(activeLoad.id)
      }
    }

    fetchLoad()
  }, [driverPhone, supabase])

  const startTracking = useCallback((loadId: string) => {
    if (tracking || !navigator.geolocation) return

    setTracking(true)
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed, heading } = position.coords
        setCurrentLocation({ lat: latitude, lng: longitude })

        // Send to server
        try {
          await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              load_id: loadId,
              lat: latitude,
              lng: longitude,
              speed: speed || 0,
              heading: heading || 0,
            }),
          })
        } catch (error) {
          console.error('Failed to send location:', error)
        }
      },
      (error) => console.error('Geolocation error:', error),
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 60000,
      }
    )
    setWatchId(id)
  }, [tracking])

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
    setTracking(false)
  }, [watchId])

  const updateStatus = async (newStatus: LoadStatus) => {
    if (!load) return
    setUpdating(true)

    try {
      // Get current location for status update
      let lat = null, lng = null
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        }).catch(() => null)
        if (position) {
          lat = position.coords.latitude
          lng = position.coords.longitude
        }
      }

      // Update load status
      await supabase
        .from('loads')
        .update({ status: newStatus })
        .eq('id', load.id)

      // Add status history
      await supabase.from('status_history').insert({
        load_id: load.id,
        status: newStatus,
        lat,
        lng,
        created_by_type: 'driver',
      })

      // Start/stop tracking based on status
      if (['en_route_pickup', 'en_route_delivery'].includes(newStatus)) {
        startTracking(load.id)
      } else if (newStatus === 'delivered') {
        stopTracking()
      }

      setLoad({ ...load, status: newStatus })
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const getNextStatus = (): LoadStatus | null => {
    const currentIndex = driverStatusFlow.findIndex((s) => s.status === load?.status)
    if (currentIndex === -1 || currentIndex >= driverStatusFlow.length - 1) return null
    return driverStatusFlow[currentIndex + 1].status
  }

  const getNextLabel = (): string => {
    const current = driverStatusFlow.find((s) => s.status === load?.status)
    return current?.nextLabel || 'Update Status'
  }

  // Login screen
  if (!driverPhone) {
    return <DriverLogin onLogin={setDriverPhone} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // No active load
  if (!load) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen text-center">
        <Truck className="h-16 w-16 text-gray-400 mb-4" />
        <h1 className="text-xl font-bold mb-2">No Active Load</h1>
        <p className="text-gray-500 mb-6">
          Check back later or contact dispatch for your next assignment.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem('driver_phone')
            setDriverPhone(null)
          }}
        >
          Sign Out
        </Button>
      </div>
    )
  }

  const nextStatus = getNextStatus()
  const isDelivered = load.status === 'delivered'

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
            {load.reference_number}
          </Badge>
          {tracking && (
            <div className="flex items-center gap-1 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Tracking
            </div>
          )}
        </div>
        <h1 className="text-lg font-bold">
          {load.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
        </h1>
      </div>

      {/* Map */}
      <div className="p-4">
        <TrackingMap
          origin={
            load.origin_lat && load.origin_lng
              ? { lat: Number(load.origin_lat), lng: Number(load.origin_lng) }
              : null
          }
          destination={
            load.dest_lat && load.dest_lng
              ? { lat: Number(load.dest_lat), lng: Number(load.dest_lng) }
              : null
          }
          currentLocation={currentLocation}
          className="h-48"
        />
      </div>

      {/* Next Stop */}
      <div className="px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                ['en_route_pickup', 'at_pickup', 'loaded', 'dispatched'].includes(load.status)
                  ? 'bg-green-100'
                  : 'bg-red-100'
              }`}>
                <MapPin className={`h-6 w-6 ${
                  ['en_route_pickup', 'at_pickup', 'loaded', 'dispatched'].includes(load.status)
                    ? 'text-green-600'
                    : 'text-red-600'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">
                  {['en_route_pickup', 'at_pickup', 'loaded', 'dispatched'].includes(load.status)
                    ? 'PICKUP'
                    : 'DELIVERY'}
                </p>
                <p className="font-bold">
                  {['en_route_pickup', 'at_pickup', 'loaded', 'dispatched'].includes(load.status)
                    ? load.origin_address
                    : load.dest_address}
                </p>
                <p className="text-sm text-gray-500">
                  {['en_route_pickup', 'at_pickup', 'loaded', 'dispatched'].includes(load.status)
                    ? `${load.origin_city}, ${load.origin_state}`
                    : `${load.dest_city}, ${load.dest_state}`}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  {(['en_route_pickup', 'at_pickup', 'loaded', 'dispatched'].includes(load.status)
                    ? load.pickup_date
                    : load.delivery_date) && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(
                        new Date(
                          ['en_route_pickup', 'at_pickup', 'loaded', 'dispatched'].includes(load.status)
                            ? load.pickup_date
                            : load.delivery_date
                        ),
                        'MMM d'
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Button */}
            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => {
                const address = ['en_route_pickup', 'at_pickup', 'loaded', 'dispatched'].includes(load.status)
                  ? `${load.origin_address}, ${load.origin_city}, ${load.origin_state}`
                  : `${load.dest_address}, ${load.dest_city}, ${load.dest_state}`
                window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank')
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              Navigate
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t shadow-lg space-y-3">
        {/* Status Update Button */}
        {!isDelivered && nextStatus && (
          <Button
            className="w-full h-14 text-lg"
            disabled={updating}
            onClick={() => updateStatus(nextStatus)}
          >
            {updating ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            {getNextLabel()}
          </Button>
        )}

        {/* Document Scan Button */}
        {['at_pickup', 'loaded', 'at_delivery', 'delivered'].includes(load.status) && (
          <Button
            variant="outline"
            className="w-full h-12"
            asChild
          >
            <Link href={`/driver/scan?load=${load.id}`}>
              <Camera className="h-5 w-5 mr-2" />
              Scan Document
            </Link>
          </Button>
        )}

        {isDelivered && (
          <div className="text-center text-green-600 font-medium flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Load Delivered Successfully!
          </div>
        )}
      </div>
    </div>
  )
}

// Simple phone login component
function DriverLogin({ onLogin }: { onLogin: (phone: string) => void }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async () => {
    if (!phone) return
    setLoading(true)

    try {
      // Check if driver exists
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('phone', phone)
        .single()

      if (driver) {
        localStorage.setItem('driver_phone', phone)
        onLogin(phone)
      } else {
        alert('Driver not found. Please contact dispatch.')
      }
    } catch (error) {
      alert('Error logging in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center mb-6">
            <div className="inline-flex p-4 bg-blue-600 rounded-full mb-4">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-bold">Driver Login</h1>
            <p className="text-gray-500 text-sm">Enter your phone number to continue</p>
          </div>
          <input
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg text-lg text-center"
          />
          <Button
            className="w-full h-12"
            disabled={!phone || loading}
            onClick={handleLogin}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
