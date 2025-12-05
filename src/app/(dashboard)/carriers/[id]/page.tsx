import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Building2, Phone, Mail, Truck, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { AddDriverDialog } from './AddDriverDialog'
import { SendDriverLinkButton } from './SendDriverLinkButton'

interface CarrierDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CarrierDetailPage({ params }: CarrierDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: carrier, error } = await supabase
    .from('carriers')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !carrier) {
    notFound()
  }

  const { data: drivers } = await supabase
    .from('drivers')
    .select('*')
    .eq('carrier_id', id)
    .order('name')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/carriers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {carrier.company_name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {carrier.mc_number && `MC# ${carrier.mc_number}`}
            {carrier.mc_number && carrier.dot_number && ' • '}
            {carrier.dot_number && `DOT# ${carrier.dot_number}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {carrier.contact_name && (
              <div>
                <p className="text-sm text-gray-500">Contact Name</p>
                <p className="font-medium">{carrier.contact_name}</p>
              </div>
            )}
            {carrier.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${carrier.contact_email}`} className="text-blue-600 hover:underline">
                  {carrier.contact_email}
                </a>
              </div>
            )}
            {carrier.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${carrier.contact_phone}`} className="text-blue-600 hover:underline">
                  {carrier.contact_phone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drivers Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Drivers
            </CardTitle>
            <AddDriverDialog carrierId={carrier.id} carrierName={carrier.company_name} />
          </CardHeader>
          <CardContent>
            {drivers && drivers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Truck #</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name || 'Unknown'}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>{driver.truck_number || '-'}</TableCell>
                      <TableCell>
                        <SendDriverLinkButton
                          driverPhone={driver.phone}
                          driverName={driver.name || 'Driver'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No drivers yet</p>
                <p className="text-sm">Add a driver to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
