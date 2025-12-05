'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Customer, Carrier } from '@/lib/types/database'

const equipmentTypes = [
  'Dry Van',
  'Reefer',
  'Flatbed',
  'Step Deck',
  'Power Only',
  'Box Truck',
  'Sprinter Van',
]

export default function NewLoadPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [carriers, setCarriers] = useState<Carrier[]>([])

  const [formData, setFormData] = useState({
    customer_id: '',
    carrier_id: '',
    origin_address: '',
    origin_city: '',
    origin_state: '',
    pickup_date: '',
    pickup_time_start: '',
    pickup_time_end: '',
    dest_address: '',
    dest_city: '',
    dest_state: '',
    delivery_date: '',
    delivery_time_start: '',
    delivery_time_end: '',
    commodity: '',
    weight: '',
    equipment_type: 'Dry Van',
    special_instructions: '',
    customer_rate: '',
    carrier_rate: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: customersData }, { data: carriersData }] = await Promise.all([
        supabase.from('customers').select('*').order('company_name'),
        supabase.from('carriers').select('*').order('company_name'),
      ])
      setCustomers(customersData || [])
      setCarriers(carriersData || [])
    }
    fetchData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!userData?.organization_id) throw new Error('No organization found')

      // Generate reference number
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const { count } = await supabase
        .from('loads')
        .select('*', { count: 'exact', head: true })
        .ilike('reference_number', `LD-${today}-%`)

      const refNum = `LD-${today}-${String((count || 0) + 1).padStart(3, '0')}`

      // Create load
      const { data: load, error } = await supabase
        .from('loads')
        .insert({
          organization_id: userData.organization_id,
          reference_number: refNum,
          customer_id: formData.customer_id || null,
          carrier_id: formData.carrier_id || null,
          origin_address: formData.origin_address,
          origin_city: formData.origin_city,
          origin_state: formData.origin_state,
          pickup_date: formData.pickup_date || null,
          pickup_time_start: formData.pickup_time_start || null,
          pickup_time_end: formData.pickup_time_end || null,
          dest_address: formData.dest_address,
          dest_city: formData.dest_city,
          dest_state: formData.dest_state,
          delivery_date: formData.delivery_date || null,
          delivery_time_start: formData.delivery_time_start || null,
          delivery_time_end: formData.delivery_time_end || null,
          commodity: formData.commodity || null,
          weight: formData.weight ? parseInt(formData.weight) : null,
          equipment_type: formData.equipment_type,
          special_instructions: formData.special_instructions || null,
          customer_rate: formData.customer_rate ? parseFloat(formData.customer_rate) : null,
          carrier_rate: formData.carrier_rate ? parseFloat(formData.carrier_rate) : null,
          status: 'booked',
        })
        .select()
        .single()

      if (error) throw error

      // Create initial status history
      await supabase.from('status_history').insert({
        load_id: load.id,
        status: 'booked',
        created_by_type: 'broker',
        created_by_id: user.id,
      })

      router.push(`/dashboard/loads/${load.id}`)
    } catch (error) {
      console.error('Error creating load:', error)
      alert('Error creating load. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const margin = formData.customer_rate && formData.carrier_rate
    ? parseFloat(formData.customer_rate) - parseFloat(formData.carrier_rate)
    : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/loads">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create New Load
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Enter the shipment details below
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Carrier */}
        <Card>
          <CardHeader>
            <CardTitle>Parties</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(v) => setFormData({ ...formData, customer_id: v })}
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
                value={formData.carrier_id}
                onValueChange={(v) => setFormData({ ...formData, carrier_id: v })}
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
          </CardContent>
        </Card>

        {/* Origin */}
        <Card>
          <CardHeader>
            <CardTitle>Origin (Pickup)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                required
                value={formData.origin_address}
                onChange={(e) =>
                  setFormData({ ...formData, origin_address: e.target.value })
                }
                placeholder="123 Warehouse Ave"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.origin_city}
                  onChange={(e) =>
                    setFormData({ ...formData, origin_city: e.target.value })
                  }
                  placeholder="Chicago"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.origin_state}
                  onChange={(e) =>
                    setFormData({ ...formData, origin_state: e.target.value })
                  }
                  placeholder="IL"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Pickup Date</Label>
                <Input
                  type="date"
                  value={formData.pickup_date}
                  onChange={(e) =>
                    setFormData({ ...formData, pickup_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Time Start</Label>
                <Input
                  type="time"
                  value={formData.pickup_time_start}
                  onChange={(e) =>
                    setFormData({ ...formData, pickup_time_start: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Time End</Label>
                <Input
                  type="time"
                  value={formData.pickup_time_end}
                  onChange={(e) =>
                    setFormData({ ...formData, pickup_time_end: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destination */}
        <Card>
          <CardHeader>
            <CardTitle>Destination (Delivery)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                required
                value={formData.dest_address}
                onChange={(e) =>
                  setFormData({ ...formData, dest_address: e.target.value })
                }
                placeholder="456 Distribution Center Blvd"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.dest_city}
                  onChange={(e) =>
                    setFormData({ ...formData, dest_city: e.target.value })
                  }
                  placeholder="Dallas"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.dest_state}
                  onChange={(e) =>
                    setFormData({ ...formData, dest_state: e.target.value })
                  }
                  placeholder="TX"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Time Start</Label>
                <Input
                  type="time"
                  value={formData.delivery_time_start}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_time_start: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Time End</Label>
                <Input
                  type="time"
                  value={formData.delivery_time_end}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_time_end: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Load Details */}
        <Card>
          <CardHeader>
            <CardTitle>Load Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Input
                  value={formData.commodity}
                  onChange={(e) =>
                    setFormData({ ...formData, commodity: e.target.value })
                  }
                  placeholder="General Freight"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (lbs)</Label>
                <Input
                  type="number"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: e.target.value })
                  }
                  placeholder="42000"
                />
              </div>
              <div className="space-y-2">
                <Label>Equipment Type</Label>
                <Select
                  value={formData.equipment_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, equipment_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={formData.special_instructions}
                onChange={(e) =>
                  setFormData({ ...formData, special_instructions: e.target.value })
                }
                placeholder="Driver must check in at security gate..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Customer Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.customer_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_rate: e.target.value })
                  }
                  placeholder="2500.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Carrier Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.carrier_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, carrier_rate: e.target.value })
                  }
                  placeholder="2200.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Margin</Label>
                <div
                  className={`h-10 px-3 flex items-center rounded-md border bg-gray-50 dark:bg-gray-800 font-medium ${
                    margin > 0
                      ? 'text-green-600'
                      : margin < 0
                      ? 'text-red-600'
                      : ''
                  }`}
                >
                  ${margin.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/loads">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Load
          </Button>
        </div>
      </form>
    </div>
  )
}
