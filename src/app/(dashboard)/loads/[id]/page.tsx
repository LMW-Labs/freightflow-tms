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
  User,
  DollarSign,
  FileText,
  ExternalLink,
  CheckCircle,
  Circle,
  Truck,
  Phone,
  Mail,
  Building2,
  Hash,
  Check,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { CopyButton } from '@/components/CopyButton'
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

// Document check indicator
function DocCheck({ received, label }: { received: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {received ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-gray-300" />
      )}
      <span className={received ? 'text-green-600' : 'text-gray-400'}>{label}</span>
    </div>
  )
}

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

  // Format time helper
  const formatTime = (time: string | null) => {
    if (!time) return null
    try {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minutes} ${ampm}`
    } catch {
      return time
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/loads">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {load.reference_number}
              </h1>
              <StatusBadge status={load.status as LoadStatus} />
              <Badge variant={load.load_type === 'LTL' ? 'secondary' : 'outline'}>
                {load.load_type || 'TL'}
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Booked {format(new Date(load.booked_date || load.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        <LoadActions load={load} />
      </div>

      {/* Quick Info Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <span className="text-xs text-gray-500 uppercase">PRO #</span>
          <p className="font-semibold">{load.pro_number || '-'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase">PO #</span>
          <p className="font-semibold">{load.po_number || '-'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase">BOL #</span>
          <p className="font-semibold">{load.bol_number || '-'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase">Equipment</span>
          <p className="font-semibold">{load.equipment_code || load.equipment_type}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase">Sales Rep</span>
          <p className="font-semibold">{load.sales_rep_1 || '-'}</p>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase">Hauler</span>
          <p className="font-semibold">{load.hauler_name || '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Map, Route, Timeline */}
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
                <CopyButton text={trackingUrl} />
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/track/${load.tracking_token}`} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Route Details - Side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <div className="w-3 h-3 rounded-full bg-green-600" />
                  PICKUP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-lg">{load.pickup_name || load.customer?.company_name || '-'}</p>
                  <p className="text-gray-600 dark:text-gray-400">{load.origin_address}</p>
                  <p className="text-gray-500">{load.origin_city}, {load.origin_state}</p>
                </div>
                {load.pickup_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{load.pickup_contact}</span>
                  </div>
                )}
                {load.pickup_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${load.pickup_phone}`} className="text-blue-600 hover:underline">
                      {load.pickup_phone}
                    </a>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-4 text-sm">
                  {load.pickup_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {format(new Date(load.pickup_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {load.pickup_time_start && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {formatTime(load.pickup_time_start)}
                      {load.pickup_time_end && ` - ${formatTime(load.pickup_time_end)}`}
                    </span>
                  )}
                </div>
                {load.pickup_notes && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                    <strong>Notes:</strong> {load.pickup_notes}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <div className="w-3 h-3 rounded-full bg-red-600" />
                  DELIVERY
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-lg">{load.delivery_name || '-'}</p>
                  <p className="text-gray-600 dark:text-gray-400">{load.dest_address}</p>
                  <p className="text-gray-500">{load.dest_city}, {load.dest_state}</p>
                </div>
                {load.delivery_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{load.delivery_contact}</span>
                  </div>
                )}
                {load.delivery_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${load.delivery_phone}`} className="text-blue-600 hover:underline">
                      {load.delivery_phone}
                    </a>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-4 text-sm">
                  {load.delivery_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {format(new Date(load.delivery_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {load.delivery_time_start && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {formatTime(load.delivery_time_start)}
                      {load.delivery_time_end && ` - ${formatTime(load.delivery_time_end)}`}
                    </span>
                  )}
                </div>
                {load.delivery_notes && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                    <strong>Notes:</strong> {load.delivery_notes}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

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
          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {load.customer && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase">Customer/Shipper</span>
                  <p className="font-semibold">{load.customer.company_name}</p>
                  {load.customer.contact_name && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <User className="h-3 w-3 text-gray-400" />
                      <span>{load.customer.contact_name}</span>
                    </div>
                  )}
                  {load.customer.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <a href={`mailto:${load.customer.contact_email}`} className="text-blue-600 hover:underline">
                        {load.customer.contact_email}
                      </a>
                    </div>
                  )}
                  {load.customer.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <a href={`tel:${load.customer.contact_phone}`} className="text-blue-600 hover:underline">
                        {load.customer.contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {load.carrier && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase">Carrier</span>
                  <p className="font-semibold">{load.carrier.company_name}</p>
                  {load.carrier.mc_number && (
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <Hash className="h-3 w-3 text-gray-400" />
                      <span>MC# {load.carrier.mc_number}</span>
                    </div>
                  )}
                  {load.carrier.dot_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-3 w-3 text-gray-400" />
                      <span>DOT# {load.carrier.dot_number}</span>
                    </div>
                  )}
                  {load.carrier.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <a href={`tel:${load.carrier.contact_phone}`} className="text-blue-600 hover:underline">
                        {load.carrier.contact_phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {load.driver && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-xs text-gray-500 uppercase">Driver</span>
                  <p className="font-semibold">{load.driver.name || 'Unknown'}</p>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <a href={`tel:${load.driver.phone}`} className="text-blue-600 hover:underline">
                      {load.driver.phone}
                    </a>
                  </div>
                  {load.driver.truck_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="h-3 w-3 text-gray-400" />
                      <span>Truck# {load.driver.truck_number}</span>
                    </div>
                  )}
                </div>
              )}
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
              {load.equipment_code && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Equipment Code</span>
                  <span className="font-medium">{load.equipment_code}</span>
                </div>
              )}
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
              <div className="flex justify-between">
                <span className="text-gray-500">Load Type</span>
                <Badge variant={load.load_type === 'LTL' ? 'secondary' : 'outline'}>
                  {load.load_type || 'TL'}
                </Badge>
              </div>
              {load.special_instructions && (
                <div className="pt-2">
                  <span className="text-gray-500 text-sm">Special Instructions:</span>
                  <p className="mt-1 text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                    {load.special_instructions}
                  </p>
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
                <span className="font-medium text-lg">
                  ${load.customer_rate?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Carrier Rate</span>
                <span className="font-medium text-lg">
                  ${load.carrier_rate?.toFixed(2) || '0.00'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Margin</span>
                <span
                  className={`font-bold text-lg ${
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

          {/* Document Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Document Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DocCheck received={load.rate_con_received || false} label="Rate Confirmation" />
              <DocCheck received={load.pod_received || false} label="Proof of Delivery (POD)" />
              <DocCheck received={load.carrier_invoice_received || false} label="Carrier Invoice" />

              <Separator className="my-4" />

              {load.documents && load.documents.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-sm text-gray-500">Uploaded Files:</span>
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
                <p className="text-sm text-gray-500 text-center py-2">
                  No documents uploaded yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sales Info */}
          {(load.sales_rep_1 || load.sales_rep_2) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Sales Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {load.sales_rep_1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Primary Rep</span>
                    <span className="font-medium">{load.sales_rep_1}</span>
                  </div>
                )}
                {load.sales_rep_2 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Secondary Rep</span>
                    <span className="font-medium">{load.sales_rep_2}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
