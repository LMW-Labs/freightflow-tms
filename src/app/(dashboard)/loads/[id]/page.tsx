import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Package,
  Truck,
  User,
  DollarSign,
  FileText,
  Copy,
  ExternalLink,
  CheckCircle,
  Circle,
} from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { LoadStatus } from '@/lib/types/database'
import { format } from 'date-fns'
import { TrackingMapWrapper } from '@/components/maps/TrackingMapWrapper'
import { LoadActions } from './LoadActions'


interface LoadDetailPageProps {
  params: Promise<{ id: string }>
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

export default async function LoadDetailPage({ params }: LoadDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: load, error } = await supabase
    .from('loads')
    .select(`
      *,
      customer:customers(*),
      carrier:carriers(*),
      driver:drivers(*),
      documents(*),
      status_history(*)
    `)
    .eq('id', id)
    .single()

  if (error || !load) {
    notFound()
  }

  const currentStatusIndex = statusOrder.indexOf(load.status as LoadStatus)
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/track/${load.tracking_token}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/loads">
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
              Created {format(new Date(load.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        <LoadActions load={load} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Map and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Tracking Map
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
              {/* Tracking Link */}
              <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-500">Tracking Link:</span>
                <code className="flex-1 text-sm truncate">{trackingUrl}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(trackingUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/track/${load.tracking_token}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
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

        {/* Right column - Details */}
        <div className="space-y-6">
          {/* Route Info */}
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
                        {load.pickup_time_end && ` - ${load.pickup_time_end}`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Destination */}
              <div>
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
                        {load.delivery_time_end && ` - ${load.delivery_time_end}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Load Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Load Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Equipment</span>
                <span className="font-medium">{load.equipment_type}</span>
              </div>
              {load.commodity && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Commodity</span>
                  <span className="font-medium">{load.commodity}</span>
                </div>
              )}
              {load.weight && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Weight</span>
                  <span className="font-medium">{load.weight.toLocaleString()} lbs</span>
                </div>
              )}
              {load.special_instructions && (
                <div className="pt-2">
                  <span className="text-gray-500 text-sm">Special Instructions:</span>
                  <p className="mt-1 text-sm">{load.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {load.customer && (
                <div>
                  <span className="text-sm text-gray-500">Customer</span>
                  <p className="font-medium">{load.customer.company_name}</p>
                  {load.customer.contact_name && (
                    <p className="text-sm text-gray-500">{load.customer.contact_name}</p>
                  )}
                </div>
              )}
              {load.carrier && (
                <div>
                  <span className="text-sm text-gray-500">Carrier</span>
                  <p className="font-medium">{load.carrier.company_name}</p>
                  {load.carrier.mc_number && (
                    <p className="text-sm text-gray-500">MC# {load.carrier.mc_number}</p>
                  )}
                </div>
              )}
              {load.driver && (
                <div>
                  <span className="text-sm text-gray-500">Driver</span>
                  <p className="font-medium">{load.driver.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{load.driver.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer Rate</span>
                <span className="font-medium">
                  ${load.customer_rate?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Carrier Rate</span>
                <span className="font-medium">
                  ${load.carrier_rate?.toFixed(2) || '0.00'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-500">Margin</span>
                <span
                  className={`font-bold ${
                    (load.customer_rate || 0) - (load.carrier_rate || 0) > 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  ${((load.customer_rate || 0) - (load.carrier_rate || 0)).toFixed(2)}
                </span>
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
              {load.documents && load.documents.length > 0 ? (
                <div className="space-y-2">
                  {load.documents.map((doc: { id: string; type: string; file_name: string; file_url: string }) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Badge variant="secondary">
                        {doc.type.toUpperCase()}
                      </Badge>
                      <span className="text-sm truncate">{doc.file_name}</span>
                      <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No documents uploaded yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
