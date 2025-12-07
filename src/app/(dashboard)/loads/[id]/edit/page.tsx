'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import Link from 'next/link'

const equipmentTypes = [
  'Van',
  'Reefer',
  'Flatbed',
  'Step Deck',
  'Power Only',
  'Box Truck',
  'Sprinter',
  'Hotshot',
  'Lowboy',
  'RGN',
  'Conestoga',
  'Double Drop',
]

const loadTypes = ['TL', 'LTL', 'Partial']

interface LoadData {
  id: string
  reference_number: string
  // Customer & Carrier
  customer_id: string | null
  carrier_id: string | null
  driver_id: string | null
  // Reference Numbers
  pro_number: string | null
  po_number: string | null
  bol_number: string | null
  // Pickup Info
  pickup_name: string | null
  pickup_contact: string | null
  pickup_phone: string | null
  origin_address: string | null
  origin_city: string | null
  origin_state: string | null
  pickup_date: string | null
  pickup_time_start: string | null
  pickup_time_end: string | null
  pickup_notes: string | null
  // Delivery Info
  delivery_name: string | null
  delivery_contact: string | null
  delivery_phone: string | null
  dest_address: string | null
  dest_city: string | null
  dest_state: string | null
  delivery_date: string | null
  delivery_time_start: string | null
  delivery_time_end: string | null
  delivery_notes: string | null
  // Load Details
  equipment_type: string | null
  equipment_code: string | null
  load_type: string | null
  commodity: string | null
  weight: number | null
  special_instructions: string | null
  // Rates
  customer_rate: number | null
  carrier_rate: number | null
  // Payment Terms
  pay_terms: string | null
  freight_terms: string | null
  // Sales
  sales_rep_1: string | null
  sales_rep_2: string | null
  hauler_name: string | null
}

export default function EditLoadPage() {
  const router = useRouter()
  const params = useParams()
  const loadId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([])
  const [carriers, setCarriers] = useState<{ id: string; company_name: string }[]>([])
  const [drivers, setDrivers] = useState<{ id: string; name: string | null; carrier_id: string }[]>([])

  const [formData, setFormData] = useState<LoadData>({
    id: '',
    reference_number: '',
    customer_id: null,
    carrier_id: null,
    driver_id: null,
    pro_number: null,
    po_number: null,
    bol_number: null,
    pickup_name: null,
    pickup_contact: null,
    pickup_phone: null,
    origin_address: null,
    origin_city: null,
    origin_state: null,
    pickup_date: null,
    pickup_time_start: null,
    pickup_time_end: null,
    pickup_notes: null,
    delivery_name: null,
    delivery_contact: null,
    delivery_phone: null,
    dest_address: null,
    dest_city: null,
    dest_state: null,
    delivery_date: null,
    delivery_time_start: null,
    delivery_time_end: null,
    delivery_notes: null,
    equipment_type: null,
    equipment_code: null,
    load_type: null,
    commodity: null,
    weight: null,
    special_instructions: null,
    customer_rate: null,
    carrier_rate: null,
    pay_terms: null,
    freight_terms: null,
    sales_rep_1: null,
    sales_rep_2: null,
    hauler_name: null,
  })

  // Fetch load and reference data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch load
        const { data: load, error: loadError } = await supabase
          .from('loads')
          .select('*')
          .eq('id', loadId)
          .single()

        if (loadError) throw loadError

        // Fetch customers
        const { data: customersData } = await supabase
          .from('customers')
          .select('id, company_name')
          .order('company_name')

        // Fetch carriers
        const { data: carriersData } = await supabase
          .from('carriers')
          .select('id, company_name')
          .order('company_name')

        // Fetch drivers
        const { data: driversData } = await supabase
          .from('drivers')
          .select('id, name, carrier_id')
          .order('name')

        setFormData(load as LoadData)
        setCustomers(customersData || [])
        setCarriers(carriersData || [])
        setDrivers(driversData || [])
      } catch (error) {
        console.error('Error fetching load:', error)
        alert('Error loading data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [loadId, supabase])

  // Filter drivers by selected carrier
  const filteredDrivers = formData.carrier_id
    ? drivers.filter(d => d.carrier_id === formData.carrier_id)
    : drivers

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const { error } = await supabase
        .from('loads')
        .update({
          customer_id: formData.customer_id,
          carrier_id: formData.carrier_id,
          driver_id: formData.driver_id,
          pro_number: formData.pro_number || null,
          po_number: formData.po_number || null,
          bol_number: formData.bol_number || null,
          pickup_name: formData.pickup_name || null,
          pickup_contact: formData.pickup_contact || null,
          pickup_phone: formData.pickup_phone || null,
          origin_address: formData.origin_address || null,
          origin_city: formData.origin_city || null,
          origin_state: formData.origin_state || null,
          pickup_date: formData.pickup_date || null,
          pickup_time_start: formData.pickup_time_start || null,
          pickup_time_end: formData.pickup_time_end || null,
          pickup_notes: formData.pickup_notes || null,
          delivery_name: formData.delivery_name || null,
          delivery_contact: formData.delivery_contact || null,
          delivery_phone: formData.delivery_phone || null,
          dest_address: formData.dest_address || null,
          dest_city: formData.dest_city || null,
          dest_state: formData.dest_state || null,
          delivery_date: formData.delivery_date || null,
          delivery_time_start: formData.delivery_time_start || null,
          delivery_time_end: formData.delivery_time_end || null,
          delivery_notes: formData.delivery_notes || null,
          equipment_type: formData.equipment_type || null,
          equipment_code: formData.equipment_code || null,
          load_type: formData.load_type || null,
          commodity: formData.commodity || null,
          weight: formData.weight || null,
          special_instructions: formData.special_instructions || null,
          customer_rate: formData.customer_rate || null,
          carrier_rate: formData.carrier_rate || null,
          pay_terms: formData.pay_terms || null,
          freight_terms: formData.freight_terms || null,
          sales_rep_1: formData.sales_rep_1 || null,
          sales_rep_2: formData.sales_rep_2 || null,
          hauler_name: formData.hauler_name || null,
        })
        .eq('id', loadId)

      if (error) throw error

      router.push(`/loads/${loadId}`)
      router.refresh()
    } catch (error) {
      console.error('Error saving load:', error)
      alert('Error saving load. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const margin = (formData.customer_rate || 0) - (formData.carrier_rate || 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/loads/${loadId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Load
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {formData.reference_number}
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle>Parties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={formData.customer_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, customer_id: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Carrier</Label>
                <Select
                  value={formData.carrier_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, carrier_id: v || null, driver_id: null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Driver</Label>
                <Select
                  value={formData.driver_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, driver_id: v || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reference Numbers */}
        <Card>
          <CardHeader>
            <CardTitle>Reference Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Load #</Label>
                <Input
                  value={formData.reference_number}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label>PRO #</Label>
                <Input
                  value={formData.pro_number || ''}
                  onChange={(e) => setFormData({ ...formData, pro_number: e.target.value })}
                  placeholder="PRO number"
                />
              </div>
              <div className="space-y-2">
                <Label>PO #</Label>
                <Input
                  value={formData.po_number || ''}
                  onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                  placeholder="PO number"
                />
              </div>
              <div className="space-y-2">
                <Label>BOL #</Label>
                <Input
                  value={formData.bol_number || ''}
                  onChange={(e) => setFormData({ ...formData, bol_number: e.target.value })}
                  placeholder="BOL number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pickup & Delivery - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pickup */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-green-600">Pickup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Location Name</Label>
                <Input
                  value={formData.pickup_name || ''}
                  onChange={(e) => setFormData({ ...formData, pickup_name: e.target.value })}
                  placeholder="Shipper name"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.origin_address || ''}
                  onChange={(e) => setFormData({ ...formData, origin_address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.origin_city || ''}
                    onChange={(e) => setFormData({ ...formData, origin_city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={formData.origin_state || ''}
                    onChange={(e) => setFormData({ ...formData, origin_state: e.target.value })}
                    placeholder="ST"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input
                    value={formData.pickup_contact || ''}
                    onChange={(e) => setFormData({ ...formData, pickup_contact: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.pickup_phone || ''}
                    onChange={(e) => setFormData({ ...formData, pickup_phone: e.target.value })}
                    placeholder="Phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.pickup_date || ''}
                  onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time Start</Label>
                  <Input
                    type="time"
                    value={formData.pickup_time_start || ''}
                    onChange={(e) => setFormData({ ...formData, pickup_time_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time End</Label>
                  <Input
                    type="time"
                    value={formData.pickup_time_end || ''}
                    onChange={(e) => setFormData({ ...formData, pickup_time_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.pickup_notes || ''}
                  onChange={(e) => setFormData({ ...formData, pickup_notes: e.target.value })}
                  placeholder="Pickup notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="text-red-600">Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Location Name</Label>
                <Input
                  value={formData.delivery_name || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_name: e.target.value })}
                  placeholder="Receiver name"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.dest_address || ''}
                  onChange={(e) => setFormData({ ...formData, dest_address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.dest_city || ''}
                    onChange={(e) => setFormData({ ...formData, dest_city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={formData.dest_state || ''}
                    onChange={(e) => setFormData({ ...formData, dest_state: e.target.value })}
                    placeholder="ST"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input
                    value={formData.delivery_contact || ''}
                    onChange={(e) => setFormData({ ...formData, delivery_contact: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.delivery_phone || ''}
                    onChange={(e) => setFormData({ ...formData, delivery_phone: e.target.value })}
                    placeholder="Phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.delivery_date || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time Start</Label>
                  <Input
                    type="time"
                    value={formData.delivery_time_start || ''}
                    onChange={(e) => setFormData({ ...formData, delivery_time_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time End</Label>
                  <Input
                    type="time"
                    value={formData.delivery_time_end || ''}
                    onChange={(e) => setFormData({ ...formData, delivery_time_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.delivery_notes || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_notes: e.target.value })}
                  placeholder="Delivery notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Load Details */}
        <Card>
          <CardHeader>
            <CardTitle>Load Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Equipment Type</Label>
                <Select
                  value={formData.equipment_type || ''}
                  onValueChange={(v) => setFormData({ ...formData, equipment_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Equipment Code</Label>
                <Input
                  value={formData.equipment_code || ''}
                  onChange={(e) => setFormData({ ...formData, equipment_code: e.target.value })}
                  placeholder="V, R, F..."
                />
              </div>
              <div className="space-y-2">
                <Label>Load Type</Label>
                <Select
                  value={formData.load_type || ''}
                  onValueChange={(v) => setFormData({ ...formData, load_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Weight (lbs)</Label>
                <Input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Weight"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Commodity</Label>
              <Input
                value={formData.commodity || ''}
                onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                placeholder="Description of freight"
              />
            </div>
            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={formData.special_instructions || ''}
                onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                placeholder="Any special handling or delivery instructions..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Rates & Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Customer Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.customer_rate || ''}
                  onChange={(e) => setFormData({ ...formData, customer_rate: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Carrier Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.carrier_rate || ''}
                  onChange={(e) => setFormData({ ...formData, carrier_rate: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Margin</Label>
                <div className={`h-10 flex items-center px-3 rounded-md border ${margin >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  ${margin.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input
                  value={formData.pay_terms || ''}
                  onChange={(e) => setFormData({ ...formData, pay_terms: e.target.value })}
                  placeholder="Net 30"
                />
              </div>
              <div className="space-y-2">
                <Label>Freight Terms</Label>
                <Input
                  value={formData.freight_terms || ''}
                  onChange={(e) => setFormData({ ...formData, freight_terms: e.target.value })}
                  placeholder="PREPAID"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales & Internal */}
        <Card>
          <CardHeader>
            <CardTitle>Sales & Internal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sales Rep 1</Label>
                <Input
                  value={formData.sales_rep_1 || ''}
                  onChange={(e) => setFormData({ ...formData, sales_rep_1: e.target.value })}
                  placeholder="Primary rep"
                />
              </div>
              <div className="space-y-2">
                <Label>Sales Rep 2</Label>
                <Input
                  value={formData.sales_rep_2 || ''}
                  onChange={(e) => setFormData({ ...formData, sales_rep_2: e.target.value })}
                  placeholder="Secondary rep"
                />
              </div>
              <div className="space-y-2">
                <Label>Hauler Name</Label>
                <Input
                  value={formData.hauler_name || ''}
                  onChange={(e) => setFormData({ ...formData, hauler_name: e.target.value })}
                  placeholder="Hauler"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href={`/loads/${loadId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
