import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Package,
  User,
  Phone,
  Mail,
  Building2,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { LoadRequestActions } from './LoadRequestActions'

interface LoadRequestDetailPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  quoted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
}

export default async function LoadRequestDetailPage({ params }: LoadRequestDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: request, error } = await supabase
    .from('load_requests')
    .select(`
      *,
      customer:customers(*)
    `)
    .eq('id', id)
    .single()

  if (error || !request) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/load-requests">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {request.reference_number}
              </h1>
              <Badge className={statusColors[request.status] || 'bg-gray-100 text-gray-800'}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Requested {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        <LoadRequestActions request={request} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Route Details */}
        <div className="lg:col-span-2 space-y-6">
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
                  <p className="font-semibold text-lg">{request.pickup_name || '-'}</p>
                  <p className="text-gray-600 dark:text-gray-400">{request.pickup_address}</p>
                  <p className="text-gray-500">
                    {request.pickup_city}, {request.pickup_state} {request.pickup_zip}
                  </p>
                </div>
                {request.pickup_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{request.pickup_contact}</span>
                  </div>
                )}
                {request.pickup_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${request.pickup_phone}`} className="text-blue-600 hover:underline">
                      {request.pickup_phone}
                    </a>
                  </div>
                )}
                {request.pickup_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${request.pickup_email}`} className="text-blue-600 hover:underline">
                      {request.pickup_email}
                    </a>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-4 text-sm">
                  {request.pickup_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {format(new Date(request.pickup_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {request.pickup_time_start && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {request.pickup_time_start}
                      {request.pickup_time_end && ` - ${request.pickup_time_end}`}
                    </span>
                  )}
                </div>
                {request.pickup_notes && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                    <strong>Notes:</strong> {request.pickup_notes}
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
                  <p className="font-semibold text-lg">{request.delivery_name || '-'}</p>
                  <p className="text-gray-600 dark:text-gray-400">{request.delivery_address}</p>
                  <p className="text-gray-500">
                    {request.delivery_city}, {request.delivery_state} {request.delivery_zip}
                  </p>
                </div>
                {request.delivery_contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{request.delivery_contact}</span>
                  </div>
                )}
                {request.delivery_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${request.delivery_phone}`} className="text-blue-600 hover:underline">
                      {request.delivery_phone}
                    </a>
                  </div>
                )}
                {request.delivery_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${request.delivery_email}`} className="text-blue-600 hover:underline">
                      {request.delivery_email}
                    </a>
                  </div>
                )}
                <Separator />
                <div className="flex items-center gap-4 text-sm">
                  {request.delivery_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {format(new Date(request.delivery_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {request.delivery_time_start && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {request.delivery_time_start}
                      {request.delivery_time_end && ` - ${request.delivery_time_end}`}
                    </span>
                  )}
                </div>
                {request.delivery_notes && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                    <strong>Notes:</strong> {request.delivery_notes}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Freight Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Freight Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Commodity</span>
                  <p className="font-medium">{request.commodity || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Weight</span>
                  <p className="font-medium">
                    {request.weight ? `${request.weight.toLocaleString()} lbs` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Quantity</span>
                  <p className="font-medium">{request.quantity || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Package Type</span>
                  <p className="font-medium">{request.package_type || '-'}</p>
                </div>
              </div>
              {request.special_instructions && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-500">Special Instructions:</span>
                  <p className="mt-1">{request.special_instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-semibold">{request.customer?.company_name || 'Unknown'}</p>
                {request.customer?.contact_name && (
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <User className="h-3 w-3 text-gray-400" />
                    <span>{request.customer.contact_name}</span>
                  </div>
                )}
                {request.customer?.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <a href={`mailto:${request.customer.contact_email}`} className="text-blue-600 hover:underline">
                      {request.customer.contact_email}
                    </a>
                  </div>
                )}
                {request.customer?.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <a href={`tel:${request.customer.contact_phone}`} className="text-blue-600 hover:underline">
                      {request.customer.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Equipment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold">{request.equipment_type || 'Van'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quote Info */}
          {request.quoted_rate && (
            <Card>
              <CardHeader>
                <CardTitle>Quote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-500">Quoted Rate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${request.quoted_rate.toFixed(2)}
                  </p>
                  {request.quoted_at && (
                    <p className="text-sm text-gray-500 mt-2">
                      Quoted {format(new Date(request.quoted_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Converted Load */}
          {request.converted_load_id && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-green-600 font-medium">Converted to Load</p>
                  <Button variant="outline" className="mt-2" asChild>
                    <Link href={`/loads/${request.converted_load_id}`}>
                      View Load
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
