import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle, Circle, FileText, Download } from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { LoadStatus } from '@/lib/types/database'
import { format } from 'date-fns'
import { TrackingMapWrapper } from '@/components/maps/TrackingMapWrapper'


interface PortalLoadDetailProps {
  params: Promise<{ slug: string; id: string }>
}

const statusOrder: LoadStatus[] = [
  'booked',
  'dispatched',
  'en_route_pickup',
  'at_pickup',
  'loaded',
  'en_route_delivery',
  'at_delivery',
  'delivered',
]

export default async function PortalLoadDetail({ params }: PortalLoadDetailProps) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!customer) {
    notFound()
  }

  const { data: load } = await supabase
    .from('loads')
    .select('*, documents(*), status_history(*)')
    .eq('id', id)
    .eq('customer_id', customer.id)
    .single()

  if (!load) {
    notFound()
  }

  const currentStatusIndex = statusOrder.indexOf(load.status as LoadStatus)

  // Filter documents to only show POD and BOL to customers
  const visibleDocuments = load.documents?.filter(
    (doc: { type: string }) => ['pod', 'bol'].includes(doc.type)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/portal/${slug}/loads`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {load.reference_number}
            </h1>
            <StatusBadge status={load.status as LoadStatus} />
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {load.origin_city}, {load.origin_state} → {load.dest_city}, {load.dest_state}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Live Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                <p className="mt-2 text-sm text-gray-500 text-center">
                  Last updated: {format(new Date(load.current_location_updated_at), 'MMM d, h:mm a')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusOrder.map((status, index) => {
                  const isComplete = index <= currentStatusIndex
                  const isCurrent = index === currentStatusIndex
                  const historyEntry = load.status_history?.find(
                    (h: { status: string }) => h.status === status
                  )

                  return (
                    <div key={status} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        {isComplete ? (
                          <CheckCircle
                            className={`h-6 w-6 ${
                              isCurrent ? 'text-blue-600' : 'text-green-600'
                            }`}
                          />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-300" />
                        )}
                        {index < statusOrder.length - 1 && (
                          <div
                            className={`w-0.5 h-8 ${
                              isComplete ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-medium ${
                              isComplete
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400'
                            }`}
                          >
                            {status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          {historyEntry && (
                            <span className="text-sm text-gray-500">
                              {format(new Date(historyEntry.created_at), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Route Details */}
          <Card>
            <CardHeader>
              <CardTitle>Route Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Origin */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 mb-1">
                  <div className="w-3 h-3 rounded-full bg-green-600" />
                  PICKUP
                </div>
                <p className="font-medium">{load.origin_address}</p>
                <p className="text-sm text-gray-500">
                  {load.origin_city}, {load.origin_state}
                </p>
                {load.pickup_date && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(load.pickup_date), 'MMM d, yyyy')}
                    </span>
                    {load.pickup_time_start && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {load.pickup_time_start}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                {/* Destination */}
                <div className="flex items-center gap-2 text-sm font-medium text-red-600 mb-1">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  DELIVERY
                </div>
                <p className="font-medium">{load.dest_address}</p>
                <p className="text-sm text-gray-500">
                  {load.dest_city}, {load.dest_state}
                </p>
                {load.delivery_date && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(load.delivery_date), 'MMM d, yyyy')}
                    </span>
                    {load.delivery_time_start && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {load.delivery_time_start}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visibleDocuments && visibleDocuments.length > 0 ? (
                <div className="space-y-2">
                  {visibleDocuments.map((doc: { id: string; type: string; file_name: string; file_url: string }) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {doc.type === 'pod' ? 'Proof of Delivery' : 'Bill of Lading'}
                        </p>
                        <p className="text-xs text-gray-500">{doc.file_name}</p>
                      </div>
                      <Download className="h-4 w-4 text-gray-400" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No documents available yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* ETA */}
          {load.eta && (
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
        </div>
      </div>
    </div>
  )
}
