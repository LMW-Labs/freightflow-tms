'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  MapPin,
  Calendar,
  Clock,
  Package,
  Truck,
  Phone,
  Mail,
  User,
  Building2,
  FileText,
  CheckCircle,
  Circle,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import { LoadStatus } from '@/lib/types/database'
import Image from 'next/image'

interface ShipperViewPageProps {
  params: Promise<{ token: string }>
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

// Status display with full names for shippers
function StatusDisplay({ status }: { status: LoadStatus }) {
  const statusMap: Record<LoadStatus, { label: string; color: string }> = {
    quoted: { label: 'Quoted', color: 'bg-gray-100 text-gray-700' },
    booked: { label: 'Booked', color: 'bg-blue-100 text-blue-700' },
    dispatched: { label: 'Dispatched', color: 'bg-purple-100 text-purple-700' },
    en_route_pickup: { label: 'En Route to Pickup', color: 'bg-yellow-100 text-yellow-700' },
    at_pickup: { label: 'At Pickup', color: 'bg-orange-100 text-orange-700' },
    loaded: { label: 'Loaded', color: 'bg-cyan-100 text-cyan-700' },
    en_route_delivery: { label: 'In Transit', color: 'bg-yellow-100 text-yellow-700' },
    at_delivery: { label: 'At Delivery', color: 'bg-orange-100 text-orange-700' },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
    invoiced: { label: 'Invoiced', color: 'bg-indigo-100 text-indigo-700' },
    paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
    complete: { label: 'Complete', color: 'bg-green-200 text-green-800' },
    customer_paid: { label: 'Complete', color: 'bg-emerald-200 text-emerald-800' },
  }

  const { label, color } = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
      {label}
    </span>
  )
}

export default function ShipperViewPage({ params }: ShipperViewPageProps) {
  const [token, setToken] = useState<string | null>(null)
  const [load, setLoad] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  useEffect(() => {
    if (!token) return

    async function fetchLoad() {
      const supabase = createClient()

      // Fetch load by tracking token (public access)
      const { data: loadData, error: loadError } = await supabase
        .from('loads')
        .select(`
          *,
          customer:customers(company_name, contact_name, contact_email, contact_phone),
          carrier:carriers(company_name),
          driver:drivers(name, phone, truck_number),
          documents(id, type, file_name, created_at)
        `)
        .eq('tracking_token', token)
        .single()

      if (loadError || !loadData) {
        setError('Load not found or link has expired')
        setLoading(false)
        return
      }

      setLoad(loadData)

      // Fetch organization for branding
      if (loadData.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name, logo_url, primary_color')
          .eq('id', loadData.organization_id)
          .single()

        if (orgData) {
          setOrganization(orgData)
        }
      }

      setLoading(false)
    }

    fetchLoad()
  }, [token])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading shipment details...</p>
        </div>
      </div>
    )
  }

  if (error || !load) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Shipment Not Found</h2>
            <p className="text-gray-500">
              {error || 'The shipment link may have expired or is invalid.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStatusIndex = statusOrder.indexOf(load.status as LoadStatus)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {organization?.logo_url ? (
                <Image
                  src={organization.logo_url}
                  alt={organization.name}
                  width={40}
                  height={40}
                  className="rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-gray-900">{organization?.name || 'FreightFlow TMS'}</h1>
                <p className="text-sm text-gray-500">Shipment Details</p>
              </div>
            </div>
            <StatusDisplay status={load.status as LoadStatus} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Reference Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <span className="text-xs text-gray-500 uppercase">Load Reference</span>
                <p className="text-xl font-bold text-gray-900">{load.reference_number}</p>
              </div>
              {load.po_number && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">PO Number</span>
                  <p className="text-xl font-bold text-gray-900">{load.po_number}</p>
                </div>
              )}
              {load.pro_number && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">PRO Number</span>
                  <p className="text-xl font-bold text-gray-900">{load.pro_number}</p>
                </div>
              )}
              {load.bol_number && (
                <div>
                  <span className="text-xs text-gray-500 uppercase">BOL Number</span>
                  <p className="text-xl font-bold text-gray-900">{load.bol_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {statusOrder.map((status, index) => {
                const isComplete = index <= currentStatusIndex
                const isCurrent = index === currentStatusIndex

                return (
                  <div key={status} className="flex flex-col items-center min-w-[100px]">
                    <div className="relative">
                      {isComplete ? (
                        <CheckCircle
                          className={`h-8 w-8 ${
                            isCurrent ? 'text-blue-600' : 'text-green-600'
                          }`}
                        />
                      ) : (
                        <Circle className="h-8 w-8 text-gray-300" />
                      )}
                      {index < statusOrder.length - 1 && (
                        <div
                          className={`absolute top-4 left-8 w-[calc(100%-8px)] h-0.5 ${
                            isComplete && index < currentStatusIndex ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                          style={{ width: '80px' }}
                        />
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 text-center ${
                        isComplete ? 'text-gray-900 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Route Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Origin */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-600 text-lg">
                <div className="w-3 h-3 rounded-full bg-green-600" />
                PICKUP / ORIGIN
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{load.pickup_name || load.customer?.company_name || 'Pickup Location'}</p>
                <p className="text-gray-600">{load.origin_address}</p>
                <p className="text-gray-500">{load.origin_city}, {load.origin_state}</p>
              </div>

              {(load.pickup_contact || load.pickup_phone) && (
                <>
                  <Separator />
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
                </>
              )}

              <Separator />
              <div className="flex items-center gap-4 text-sm">
                {load.pickup_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {format(new Date(load.pickup_date), 'EEEE, MMMM d, yyyy')}
                  </span>
                )}
              </div>
              {load.pickup_time_start && (
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>
                    {formatTime(load.pickup_time_start)}
                    {load.pickup_time_end && ` - ${formatTime(load.pickup_time_end)}`}
                  </span>
                </div>
              )}

              {load.pickup_notes && (
                <div className="p-3 bg-yellow-50 rounded-lg text-sm">
                  <strong>Notes:</strong> {load.pickup_notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Destination */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-600 text-lg">
                <div className="w-3 h-3 rounded-full bg-red-600" />
                DELIVERY / DESTINATION
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{load.delivery_name || 'Delivery Location'}</p>
                <p className="text-gray-600">{load.dest_address}</p>
                <p className="text-gray-500">{load.dest_city}, {load.dest_state}</p>
              </div>

              {(load.delivery_contact || load.delivery_phone) && (
                <>
                  <Separator />
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
                </>
              )}

              <Separator />
              <div className="flex items-center gap-4 text-sm">
                {load.delivery_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {format(new Date(load.delivery_date), 'EEEE, MMMM d, yyyy')}
                  </span>
                )}
              </div>
              {load.delivery_time_start && (
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>
                    {formatTime(load.delivery_time_start)}
                    {load.delivery_time_end && ` - ${formatTime(load.delivery_time_end)}`}
                  </span>
                </div>
              )}

              {load.delivery_notes && (
                <div className="p-3 bg-yellow-50 rounded-lg text-sm">
                  <strong>Notes:</strong> {load.delivery_notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Load Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shipment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Equipment Type</span>
                <span className="font-medium">{load.equipment_type}</span>
              </div>
              {load.equipment_code && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Equipment Code</span>
                  <Badge variant="secondary">{load.equipment_code}</Badge>
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
                  {load.load_type === 'LTL' ? 'Less Than Truckload' : 'Truckload'}
                </Badge>
              </div>
              {load.special_instructions && (
                <div className="pt-2">
                  <span className="text-gray-500 text-sm">Special Instructions:</span>
                  <p className="mt-1 text-sm bg-yellow-50 p-2 rounded">
                    {load.special_instructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carrier Info - Limited for shipper view */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Carrier Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {load.carrier ? (
                <>
                  <div>
                    <span className="text-gray-500 text-sm">Carrier Name</span>
                    <p className="font-semibold">{load.carrier.company_name}</p>
                  </div>
                  {load.driver && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-gray-500 text-sm">Driver</span>
                        <p className="font-semibold">{load.driver.name || 'Assigned'}</p>
                      </div>
                      {load.driver.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${load.driver.phone}`} className="text-blue-600 hover:underline">
                            {load.driver.phone}
                          </a>
                        </div>
                      )}
                      {load.driver.truck_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <span>Truck# {load.driver.truck_number}</span>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Carrier information will be updated once assigned
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Documents - If any are marked for shipper visibility */}
        {load.documents && load.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {load.documents
                  .filter((doc: any) => ['bol', 'pod'].includes(doc.type))
                  .map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <Badge variant="secondary">
                        {doc.type.toUpperCase()}
                      </Badge>
                      <span className="flex-1 text-sm">{doc.file_name}</span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                {load.documents.filter((doc: any) => ['bol', 'pod'].includes(doc.type)).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No documents available yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Tracking Link */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Live GPS Tracking</p>
                  <p className="text-sm text-gray-600">Track your shipment in real-time</p>
                </div>
              </div>
              <a
                href={`/track/${load.tracking_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                View Live Tracking
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 pt-8">
          <p>Questions about this shipment? Contact your representative.</p>
          {load.sales_rep_1 && (
            <p className="mt-1">Your rep: <span className="font-medium">{load.sales_rep_1}</span></p>
          )}
        </div>
      </main>
    </div>
  )
}
