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
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Truck,
  FileText,
  MapPin,
  CreditCard,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { AddDriverDialog } from './AddDriverDialog'
import { SendDriverLinkButton } from './SendDriverLinkButton'
import { SendOnboardingLinkButton } from './SendOnboardingLinkButton'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface CarrierDetailPageProps {
  params: Promise<{ id: string }>
}

// Type for carrier with all onboarding fields
interface Carrier {
  id: string
  company_name: string
  mc_number: string | null
  dot_number: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  factoring_company: string | null
  factoring_contact: string | null
  factoring_email: string | null
  factoring_phone: string | null
  w9_company_name: string | null
  w9_ein: string | null
  w9_address: string | null
  accounting_email: string | null
  remittance_address: string | null
  remittance_city: string | null
  remittance_state: string | null
  remittance_zip: string | null
  quick_pay_enrolled: boolean | null
  equipment_types: string[] | null
  preferred_lanes: string | null
  notes: string | null
  status: string | null
  onboarding_token: string | null
  onboarding_completed_at: string | null
  agreement_signed: boolean | null
  agreement_signed_at: string | null
  agreement_signer_name: string | null
  agreement_signer_ip: string | null
  created_at: string
}

// Helper to check if a field has value
function InfoRow({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5" />}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function BooleanCheck({ label, value }: { label: string; value: boolean | null | undefined }) {
  return (
    <div className="flex items-center gap-2">
      {value ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-gray-300" />
      )}
      <span className={value ? 'text-green-600' : 'text-gray-400'}>{label}</span>
    </div>
  )
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

  const carrierData = carrier as Carrier

  const { data: drivers } = await supabase
    .from('drivers')
    .select('*')
    .eq('carrier_id', id)
    .order('name')

  // Format address helper
  const formatAddress = (address: string | null, city: string | null, state: string | null, zip: string | null) => {
    const parts = [address, city, state, zip].filter(Boolean)
    if (parts.length === 0) return null
    if (city && state) {
      return `${address || ''}\n${city}, ${state} ${zip || ''}`.trim()
    }
    return parts.join(', ')
  }

  const physicalAddress = formatAddress(carrierData.address, carrierData.city, carrierData.state, carrierData.zip)
  const remittanceAddress = formatAddress(carrierData.remittance_address, carrierData.remittance_city, carrierData.remittance_state, carrierData.remittance_zip)

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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {carrierData.company_name}
            </h1>
            {carrierData.status && (
              <Badge variant={
                carrierData.status === 'Active' ? 'default' :
                carrierData.status === 'Onboarding Signed' ? 'default' :
                'secondary'
              }>
                {carrierData.status}
              </Badge>
            )}
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {carrierData.mc_number && `MC# ${carrierData.mc_number}`}
            {carrierData.mc_number && carrierData.dot_number && ' • '}
            {carrierData.dot_number && `DOT# ${carrierData.dot_number}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/carriers/${id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <SendOnboardingLinkButton carrierId={carrierData.id} carrierName={carrierData.company_name} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Company & Contact Info */}
        <div className="space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="MC Number" value={carrierData.mc_number} />
              <InfoRow label="DOT Number" value={carrierData.dot_number} />

              {physicalAddress && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Physical Address
                  </p>
                  <p className="font-medium whitespace-pre-line">{physicalAddress}</p>
                </div>
              )}

              <Separator />

              <InfoRow label="Contact Name" value={carrierData.contact_name} />
              {carrierData.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${carrierData.contact_email}`} className="text-blue-600 hover:underline">
                    {carrierData.contact_email}
                  </a>
                </div>
              )}
              {carrierData.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${carrierData.contact_phone}`} className="text-blue-600 hover:underline">
                    {carrierData.contact_phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factoring Info */}
          {(carrierData.factoring_company || carrierData.factoring_contact) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Factoring Company
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="Company Name" value={carrierData.factoring_company} />
                <InfoRow label="Contact" value={carrierData.factoring_contact} />
                {carrierData.factoring_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${carrierData.factoring_email}`} className="text-blue-600 hover:underline">
                      {carrierData.factoring_email}
                    </a>
                  </div>
                )}
                {carrierData.factoring_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{carrierData.factoring_phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* W9 Info */}
          {(carrierData.w9_company_name || carrierData.w9_ein) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  W9 Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="Legal Name" value={carrierData.w9_company_name} />
                <InfoRow label="EIN/Tax ID" value={carrierData.w9_ein} />
                <InfoRow label="W9 Address" value={carrierData.w9_address} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle Column - Accounting, Equipment, Agreement */}
        <div className="space-y-6">
          {/* Accounting & Remittance */}
          {(carrierData.accounting_email || remittanceAddress || carrierData.quick_pay_enrolled !== null) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Accounting & Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {carrierData.accounting_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Accounting Email</p>
                      <a href={`mailto:${carrierData.accounting_email}`} className="text-blue-600 hover:underline">
                        {carrierData.accounting_email}
                      </a>
                    </div>
                  </div>
                )}

                {remittanceAddress && (
                  <div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Remittance Address
                    </p>
                    <p className="font-medium whitespace-pre-line">{remittanceAddress}</p>
                  </div>
                )}

                <Separator />

                <BooleanCheck label="Quick Pay Enrolled" value={carrierData.quick_pay_enrolled} />
              </CardContent>
            </Card>
          )}

          {/* Equipment & Lanes */}
          {(carrierData.equipment_types?.length || carrierData.preferred_lanes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Equipment & Lanes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {carrierData.equipment_types && carrierData.equipment_types.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Equipment Types</p>
                    <div className="flex flex-wrap gap-2">
                      {carrierData.equipment_types.map((type) => (
                        <Badge key={type} variant="secondary">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {carrierData.preferred_lanes && (
                  <div>
                    <p className="text-xs text-gray-500">Preferred Lanes</p>
                    <p className="font-medium">{carrierData.preferred_lanes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agreement Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Broker-Carrier Agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BooleanCheck label="Agreement Signed" value={carrierData.agreement_signed} />

              {carrierData.agreement_signed && (
                <>
                  {carrierData.agreement_signer_name && (
                    <InfoRow label="Signed By" value={carrierData.agreement_signer_name} />
                  )}
                  {carrierData.agreement_signed_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Signed On</p>
                        <p className="font-medium">
                          {format(new Date(carrierData.agreement_signed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                  {carrierData.agreement_signer_ip && (
                    <InfoRow label="IP Address" value={carrierData.agreement_signer_ip} />
                  )}
                </>
              )}

              {!carrierData.agreement_signed && (
                <p className="text-sm text-gray-500">
                  Agreement has not been signed yet. Send the onboarding link to the carrier.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {carrierData.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{carrierData.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Drivers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Drivers
            </CardTitle>
            <AddDriverDialog carrierId={carrierData.id} carrierName={carrierData.company_name} />
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
