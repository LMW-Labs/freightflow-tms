'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Loader2, Building2, FileText, CreditCard, Truck, Plus, X } from 'lucide-react'
import Link from 'next/link'

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

const EQUIPMENT_TYPES = [
  { id: 'van', label: 'Van (Dry Van)' },
  { id: 'flatbed', label: 'Flatbed' },
  { id: 'reefer', label: 'Reefer (Refrigerated)' },
  { id: 'step_deck', label: 'Step Deck' },
  { id: 'lowboy', label: 'Lowboy' },
  { id: 'conestoga', label: 'Conestoga' },
  { id: 'power_only', label: 'Power Only' },
  { id: 'hotshot', label: 'Hotshot' },
]

interface PreferredLane {
  origin: string
  destination: string
}

export default function NewCarrierPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [preferredLanes, setPreferredLanes] = useState<PreferredLane[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])

  const [formData, setFormData] = useState({
    // Company Info
    company_name: '',
    mc_number: '',
    dot_number: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    fax: '',
    // Factoring
    factoring_company: '',
    factoring_contact: '',
    factoring_phone: '',
    factoring_email: '',
    // W9 Info
    w9_name: '',
    w9_type: '',
    w9_address: '',
    w9_city_state_zip: '',
    w9_tin: '',
    // Remittance
    remit_name: '',
    remit_address: '',
    remit_city: '',
    remit_state: '',
    remit_zip: '',
    // Payment
    quickpay_enabled: false,
    pay_method: 'check',
    // Status
    status: 'pending',
  })

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleEquipment = (id: string) => {
    setSelectedEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const addLane = () => {
    setPreferredLanes(prev => [...prev, { origin: '', destination: '' }])
  }

  const updateLane = (index: number, field: 'origin' | 'destination', value: string) => {
    setPreferredLanes(prev => {
      const updated = [...prev]
      updated[index][field] = value
      return updated
    })
  }

  const removeLane = (index: number) => {
    setPreferredLanes(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!userData?.organization_id) throw new Error('No organization found')

      const { error } = await supabase.from('carriers').insert({
        organization_id: userData.organization_id,
        company_name: formData.company_name,
        mc_number: formData.mc_number || null,
        dot_number: formData.dot_number || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        fax: formData.fax || null,
        factoring_company: formData.factoring_company || null,
        factoring_contact: formData.factoring_contact || null,
        factoring_phone: formData.factoring_phone || null,
        factoring_email: formData.factoring_email || null,
        w9_name: formData.w9_name || null,
        w9_type: formData.w9_type || null,
        w9_address: formData.w9_address || null,
        w9_city_state_zip: formData.w9_city_state_zip || null,
        w9_tin: formData.w9_tin || null,
        remit_name: formData.remit_name || null,
        remit_address: formData.remit_address || null,
        remit_city: formData.remit_city || null,
        remit_state: formData.remit_state || null,
        remit_zip: formData.remit_zip || null,
        quickpay_enabled: formData.quickpay_enabled,
        pay_method: formData.pay_method,
        equipment_types: selectedEquipment.length > 0 ? selectedEquipment : null,
        preferred_lanes: preferredLanes.length > 0 ? preferredLanes : null,
        status: formData.status,
      })

      if (error) throw error

      router.push('/carriers')
    } catch (error) {
      console.error('Error creating carrier:', error)
      alert('Error creating carrier. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/carriers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Carrier
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Add a new trucking company to your network
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  required
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Swift Transportation"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>MC Number</Label>
                <Input
                  value={formData.mc_number}
                  onChange={(e) => handleChange('mc_number', e.target.value)}
                  placeholder="123456"
                />
              </div>
              <div className="space-y-2">
                <Label>DOT Number</Label>
                <Input
                  value={formData.dot_number}
                  onChange={(e) => handleChange('dot_number', e.target.value)}
                  placeholder="789012"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={formData.state} onValueChange={(v) => handleChange('state', v)}>
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
                <Label>ZIP</Label>
                <Input
                  value={formData.zip}
                  onChange={(e) => handleChange('zip', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder="Jane Dispatcher"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="dispatch@carrier.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="(555) 987-6543"
                />
              </div>
              <div className="space-y-2">
                <Label>Fax</Label>
                <Input
                  type="tel"
                  value={formData.fax}
                  onChange={(e) => handleChange('fax', e.target.value)}
                  placeholder="(555) 987-6544"
                />
              </div>
            </div>

            {/* Factoring Company */}
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Factoring Company (if applicable)
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-500">Company Name</Label>
                  <Input
                    value={formData.factoring_company}
                    onChange={(e) => handleChange('factoring_company', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-500">Contact Name</Label>
                  <Input
                    value={formData.factoring_contact}
                    onChange={(e) => handleChange('factoring_contact', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-500">Phone</Label>
                  <Input
                    type="tel"
                    value={formData.factoring_phone}
                    onChange={(e) => handleChange('factoring_phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-500">Email</Label>
                  <Input
                    type="email"
                    value={formData.factoring_email}
                    onChange={(e) => handleChange('factoring_email', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* W9 Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              W9 Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Legal Name (as shown on W9)</Label>
                <Input
                  value={formData.w9_name}
                  onChange={(e) => handleChange('w9_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select value={formData.w9_type} onValueChange={(v) => handleChange('w9_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual/Sole Proprietor</SelectItem>
                    <SelectItem value="c_corp">C Corporation</SelectItem>
                    <SelectItem value="s_corp">S Corporation</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.w9_address}
                onChange={(e) => handleChange('w9_address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City, State, ZIP</Label>
                <Input
                  value={formData.w9_city_state_zip}
                  onChange={(e) => handleChange('w9_city_state_zip', e.target.value)}
                  placeholder="City, ST 12345"
                />
              </div>
              <div className="space-y-2">
                <Label>Tax ID (EIN/SSN)</Label>
                <Input
                  value={formData.w9_tin}
                  onChange={(e) => handleChange('w9_tin', e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounting / Remittance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Accounting Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Remit To Name</Label>
              <Input
                value={formData.remit_name}
                onChange={(e) => handleChange('remit_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Remit Address</Label>
              <Input
                value={formData.remit_address}
                onChange={(e) => handleChange('remit_address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>City</Label>
                <Input
                  value={formData.remit_city}
                  onChange={(e) => handleChange('remit_city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={formData.remit_state} onValueChange={(v) => handleChange('remit_state', v)}>
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
                <Label>ZIP</Label>
                <Input
                  value={formData.remit_zip}
                  onChange={(e) => handleChange('remit_zip', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={formData.pay_method} onValueChange={(v) => handleChange('pay_method', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="ach">ACH/Direct Deposit</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                    <SelectItem value="factoring">Pay to Factoring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="quickpay"
                  checked={formData.quickpay_enabled}
                  onCheckedChange={(checked) => handleChange('quickpay_enabled', !!checked)}
                />
                <Label htmlFor="quickpay" className="cursor-pointer">
                  Enable QuickPay (faster payment, reduced rate)
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Equipment Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {EQUIPMENT_TYPES.map((eq) => (
                <div key={eq.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={eq.id}
                    checked={selectedEquipment.includes(eq.id)}
                    onCheckedChange={() => toggleEquipment(eq.id)}
                  />
                  <Label htmlFor={eq.id} className="cursor-pointer text-sm">
                    {eq.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preferred Lanes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preferred Lanes</span>
              <Button type="button" variant="outline" size="sm" onClick={addLane}>
                <Plus className="h-4 w-4 mr-1" />
                Add Lane
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {preferredLanes.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No preferred lanes added yet. Click "Add Lane" to add one.
              </p>
            ) : (
              <div className="space-y-3">
                {preferredLanes.map((lane, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Origin (e.g., Dallas, TX)"
                      value={lane.origin}
                      onChange={(e) => updateLane(index, 'origin', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-gray-400">→</span>
                    <Input
                      placeholder="Destination (e.g., Atlanta, GA)"
                      value={lane.destination}
                      onChange={(e) => updateLane(index, 'destination', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLane(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/carriers">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Carrier
          </Button>
        </div>
      </form>
    </div>
  )
}
