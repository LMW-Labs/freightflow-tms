'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, MapPin, Calendar, Package, Truck, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const equipmentTypes = [
  { value: 'Van', label: 'Van (Dry Van)' },
  { value: 'Flatbed', label: 'Flatbed' },
  { value: 'Reefer', label: 'Reefer (Refrigerated)' },
  { value: 'Step Deck', label: 'Step Deck' },
  { value: 'Lowboy', label: 'Lowboy' },
  { value: 'Conestoga', label: 'Conestoga' },
  { value: 'Power Only', label: 'Power Only' },
  { value: 'Hotshot', label: 'Hotshot' },
  { value: 'Other', label: 'Other' },
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function RequestLoadPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  const [customerId, setCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    // Pickup
    pickup_name: '',
    pickup_address: '',
    pickup_city: '',
    pickup_state: '',
    pickup_zip: '',
    pickup_contact: '',
    pickup_phone: '',
    pickup_email: '',
    pickup_date: '',
    pickup_time_start: '',
    pickup_time_end: '',
    pickup_notes: '',
    // Delivery
    delivery_name: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_zip: '',
    delivery_contact: '',
    delivery_phone: '',
    delivery_email: '',
    delivery_date: '',
    delivery_time_start: '',
    delivery_time_end: '',
    delivery_notes: '',
    // Freight
    commodity: '',
    weight: '',
    quantity: '',
    package_type: '',
    equipment_type: 'Van',
    special_instructions: '',
  })

  // Get customer ID from slug
  useEffect(() => {
    const fetchCustomer = async () => {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('slug', slug)
        .single()

      if (customer) {
        setCustomerId(customer.id)
      }
      setLoading(false)
    }
    fetchCustomer()
  }, [slug, supabase])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) return

    setSubmitting(true)
    try {
      // Generate reference number (LP prefix for "Load Pending")
      const timestamp = Date.now().toString().slice(-6)
      const reference_number = `LP00-${timestamp}`

      const { error } = await supabase.from('load_requests').insert({
        customer_id: customerId,
        reference_number,
        status: 'pending',
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push(`/portal/${slug}`)
      }, 3000)
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-600 mb-2">Request Submitted!</h1>
        <p className="text-gray-500 mb-4">
          Our team will review your request and provide a quote shortly.
        </p>
        <p className="text-sm text-gray-400">Redirecting to your portal...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/portal/${slug}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Request a Load</h1>
          <p className="text-gray-500">Fill out the details below to request a quote</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pickup Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="h-5 w-5" />
                </div>
                Pickup Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup_name">Location Name *</Label>
                <Input
                  id="pickup_name"
                  value={formData.pickup_name}
                  onChange={(e) => handleChange('pickup_name', e.target.value)}
                  placeholder="Company or Facility Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickup_address">Address *</Label>
                <Input
                  id="pickup_address"
                  value={formData.pickup_address}
                  onChange={(e) => handleChange('pickup_address', e.target.value)}
                  placeholder="Street Address"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="pickup_city">City *</Label>
                  <Input
                    id="pickup_city"
                    value={formData.pickup_city}
                    onChange={(e) => handleChange('pickup_city', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_state">State *</Label>
                  <Select
                    value={formData.pickup_state}
                    onValueChange={(v) => handleChange('pickup_state', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_zip">ZIP</Label>
                  <Input
                    id="pickup_zip"
                    value={formData.pickup_zip}
                    onChange={(e) => handleChange('pickup_zip', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="pickup_contact">Contact Name</Label>
                  <Input
                    id="pickup_contact"
                    value={formData.pickup_contact}
                    onChange={(e) => handleChange('pickup_contact', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_phone">Contact Phone</Label>
                  <Input
                    id="pickup_phone"
                    value={formData.pickup_phone}
                    onChange={(e) => handleChange('pickup_phone', e.target.value)}
                    type="tel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickup_email">Contact Email</Label>
                <Input
                  id="pickup_email"
                  value={formData.pickup_email}
                  onChange={(e) => handleChange('pickup_email', e.target.value)}
                  type="email"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="pickup_date">Date *</Label>
                  <Input
                    id="pickup_date"
                    type="date"
                    value={formData.pickup_date}
                    onChange={(e) => handleChange('pickup_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_time_start">Time From</Label>
                  <Input
                    id="pickup_time_start"
                    type="time"
                    value={formData.pickup_time_start}
                    onChange={(e) => handleChange('pickup_time_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_time_end">Time To</Label>
                  <Input
                    id="pickup_time_end"
                    type="time"
                    value={formData.pickup_time_end}
                    onChange={(e) => handleChange('pickup_time_end', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickup_notes">Pickup Notes</Label>
                <Textarea
                  id="pickup_notes"
                  value={formData.pickup_notes}
                  onChange={(e) => handleChange('pickup_notes', e.target.value)}
                  placeholder="Special instructions, dock info, etc."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <div className="p-2 bg-red-100 rounded-lg">
                  <MapPin className="h-5 w-5" />
                </div>
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_name">Location Name *</Label>
                <Input
                  id="delivery_name"
                  value={formData.delivery_name}
                  onChange={(e) => handleChange('delivery_name', e.target.value)}
                  placeholder="Company or Facility Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_address">Address *</Label>
                <Input
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => handleChange('delivery_address', e.target.value)}
                  placeholder="Street Address"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="delivery_city">City *</Label>
                  <Input
                    id="delivery_city"
                    value={formData.delivery_city}
                    onChange={(e) => handleChange('delivery_city', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_state">State *</Label>
                  <Select
                    value={formData.delivery_state}
                    onValueChange={(v) => handleChange('delivery_state', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_zip">ZIP</Label>
                  <Input
                    id="delivery_zip"
                    value={formData.delivery_zip}
                    onChange={(e) => handleChange('delivery_zip', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="delivery_contact">Contact Name</Label>
                  <Input
                    id="delivery_contact"
                    value={formData.delivery_contact}
                    onChange={(e) => handleChange('delivery_contact', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_phone">Contact Phone</Label>
                  <Input
                    id="delivery_phone"
                    value={formData.delivery_phone}
                    onChange={(e) => handleChange('delivery_phone', e.target.value)}
                    type="tel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_email">Contact Email</Label>
                <Input
                  id="delivery_email"
                  value={formData.delivery_email}
                  onChange={(e) => handleChange('delivery_email', e.target.value)}
                  type="email"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="delivery_date">Date *</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => handleChange('delivery_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_time_start">Time From</Label>
                  <Input
                    id="delivery_time_start"
                    type="time"
                    value={formData.delivery_time_start}
                    onChange={(e) => handleChange('delivery_time_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_time_end">Time To</Label>
                  <Input
                    id="delivery_time_end"
                    type="time"
                    value={formData.delivery_time_end}
                    onChange={(e) => handleChange('delivery_time_end', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_notes">Delivery Notes</Label>
                <Textarea
                  id="delivery_notes"
                  value={formData.delivery_notes}
                  onChange={(e) => handleChange('delivery_notes', e.target.value)}
                  placeholder="Special instructions, dock info, etc."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Freight Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              Freight Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commodity">Commodity *</Label>
                <Input
                  id="commodity"
                  value={formData.commodity}
                  onChange={(e) => handleChange('commodity', e.target.value)}
                  placeholder="What's being shipped?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  placeholder="Total weight"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  placeholder="Number of units"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="package_type">Package Type</Label>
                <Input
                  id="package_type"
                  value={formData.package_type}
                  onChange={(e) => handleChange('package_type', e.target.value)}
                  placeholder="Pallets, Skids, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="equipment_type">Equipment Type *</Label>
                <Select
                  value={formData.equipment_type}
                  onValueChange={(v) => handleChange('equipment_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((eq) => (
                      <SelectItem key={eq.value} value={eq.value}>{eq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="special_instructions">Special Instructions</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => handleChange('special_instructions', e.target.value)}
                  placeholder="Any additional requirements..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href={`/portal/${slug}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting} className="min-w-32">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
