import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Clock, Truck, Package } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { TrackingMapWrapper } from '@/components/maps/TrackingMapWrapper'


function getSupabase() {  return createClient(    process.env.NEXT_PUBLIC_SUPABASE_URL!,    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  )}
interface TrackingPageProps {
  params: Promise<{ token: string }>
}

const statusLabels: Record<string, string> = {
  quoted: 'Quote Pending',
  booked: 'Booked',
  dispatched: 'Dispatched',
  en_route_pickup: 'En Route to Pickup',
  at_pickup: 'At Pickup Location',
  loaded: 'Loaded',
  en_route_delivery: 'In Transit to Delivery',
  at_delivery: 'At Delivery Location',
  delivered: 'Delivered',
  invoiced: 'Delivered',
  paid: 'Delivered',
}

export default async function PublicTrackingPage({ params }: TrackingPageProps) {
  const { token } = await params

  const { data: load, error } = await getSupabase()
    .from('loads')
    .select('*, organization:organizations(name, logo_url, primary_color)')
    .eq('tracking_token', token)
    .single()

  if (error || !load) {
    notFound()
  }

  const org = load.organization
  const isInTransit = ['en_route_pickup', 'en_route_delivery'].includes(load.status)
  const isDelivered = ['delivered', 'invoiced', 'paid'].includes(load.status)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header
        className="p-4 text-white"
        style={{ backgroundColor: org?.primary_color || '#3B82F6' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {org?.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-8 w-auto" />
          ) : (
            <div className="p-2 bg-white/20 rounded-lg">
              <Package className="h-5 w-5" />
            </div>
          )}
          <span className="font-bold">{org?.name || 'Shipment Tracking'}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Status Banner */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div
                className={`inline-flex p-4 rounded-full mb-4 ${
                  isDelivered
                    ? 'bg-green-100'
                    : isInTransit
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                }`}
              >
                {isDelivered ? (
                  <Package className={`h-8 w-8 text-green-600`} />
                ) : (
                  <Truck
                    className={`h-8 w-8 ${
                      isInTransit ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  />
                )}
              </div>
              <h1
                className={`text-2xl font-bold mb-2 ${
                  isDelivered
                    ? 'text-green-600'
                    : isInTransit
                    ? 'text-blue-600'
                    : 'text-gray-900'
                }`}
              >
                {statusLabels[load.status] || load.status}
              </h1>
              <p className="text-gray-500">
                Reference: {load.reference_number}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardContent className="pt-6">
            <TrackingMapWrapper
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
              currentLocation={
                load.current_lat && load.current_lng
                  ? { lat: Number(load.current_lat), lng: Number(load.current_lng) }
                  : null
              }
              className="h-64"
            />
            {load.current_location_updated_at && (
              <p className="mt-3 text-sm text-gray-500 text-center flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />
                Last updated{' '}
                {formatDistanceToNow(new Date(load.current_location_updated_at), {
                  addSuffix: true,
                })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Route Details */}
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Origin */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <div className="w-0.5 h-full bg-gray-200 my-2" />
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium text-green-600 mb-1">PICKUP</p>
                <p className="font-medium">{load.origin_city}, {load.origin_state}</p>
                {load.pickup_date && (
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(load.pickup_date), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>

            {/* Destination */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600 mb-1">DELIVERY</p>
                <p className="font-medium">{load.dest_city}, {load.dest_state}</p>
                {load.delivery_date && (
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(load.delivery_date), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ETA */}
        {load.eta && !isDelivered && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Estimated Arrival</p>
                <p className="text-2xl font-bold text-blue-600">
                  {format(new Date(load.eta), 'MMM d, h:mm a')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 pb-8">
          This page auto-refreshes. Last checked: {format(new Date(), 'h:mm a')}
        </p>
      </main>

      {/* Auto-refresh script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            setTimeout(() => {
              window.location.reload();
            }, 60000);
          `,
        }}
      />
    </div>
  )
}
