'use client'

import { useState, useRef, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import Image from 'next/image'
import {
  Camera,
  Upload,
  Check,
  Loader2,
  FileImage,
  X,
  Truck,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ token: string }>
}

interface CarrierData {
  id: string
  company_name: string
  mc_number: string | null
  dot_number: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
}

interface DriverContact {
  id: string
  name: string
  phone: string
  email: string
  isNew?: boolean
}

const EQUIPMENT_TYPES = [
  { id: 'flatbed', label: 'Flatbed' },
  { id: 'stepdeck', label: 'Step Deck' },
  { id: 'van', label: 'Dry Van' },
  { id: 'reefer', label: 'Reefer' },
  { id: 'hotshot', label: 'Hotshot' },
  { id: 'rgn', label: 'RGN' },
  { id: 'lowboy', label: 'Lowboy' },
  { id: 'conestoga', label: 'Conestoga' },
  { id: 'power_only', label: 'Power Only' },
]

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function CarrierOnboardingPage({ params }: PageProps) {
  const { token } = use(params)
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [carrier, setCarrier] = useState<CarrierData | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Form State
  const [carrierInfo, setCarrierInfo] = useState({
    name: '',
    mc_number: '',
    dot_number: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    email: '',
    website: '',
    primary_contact: '',
    phone: '',
    fax: '',
    cell: '',
  })

  const [w9Info, setW9Info] = useState({
    name: '',
    dba_name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    federal_id: '',
  })

  const [accountingInfo, setAccountingInfo] = useState({
    payee_name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    note: '',
  })

  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([])
  const [preferredLanes, setPreferredLanes] = useState<{origin: string, destination: string}[]>([
    { origin: '', destination: '' }
  ])

  const [contacts, setContacts] = useState<DriverContact[]>([])

  const [files, setFiles] = useState<{
    insurance: File | null,
    w9: File | null,
    authority: File | null,
  }>({
    insurance: null,
    w9: null,
    authority: null,
  })

  const [agreementRead, setAgreementRead] = useState(false)
  const [signatureAccepted, setSignatureAccepted] = useState(false)
  const [signerName, setSignerName] = useState('')

  useEffect(() => {
    fetchCarrierData()
  }, [token])

  const fetchCarrierData = async () => {
    try {
      // For now, we'll fetch carrier by a lookup token
      // In production, you'd have a carrier_onboarding_tokens table
      const { data, error } = await supabase
        .from('carriers')
        .select('*, drivers(*)')
        .eq('id', token)
        .single()

      if (error) throw error
      if (!data) throw new Error('Carrier not found')

      setCarrier(data)
      setCarrierInfo({
        name: data.company_name || '',
        mc_number: data.mc_number || '',
        dot_number: data.dot_number || '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        email: data.contact_email || '',
        website: '',
        primary_contact: data.contact_name || '',
        phone: data.contact_phone || '',
        fax: '',
        cell: '',
      })

      // Load existing drivers as contacts
      if (data.drivers && data.drivers.length > 0) {
        setContacts(data.drivers.map((d: { id: string; name: string | null; phone: string; }) => ({
          id: d.id,
          name: d.name || '',
          phone: d.phone || '',
          email: '',
        })))
      }
    } catch (err) {
      console.error('Error fetching carrier:', err)
      setError('Invalid or expired onboarding link. Please contact the broker.')
    } finally {
      setLoading(false)
    }
  }

  const handleEquipmentToggle = (equipmentId: string) => {
    setEquipmentTypes(prev =>
      prev.includes(equipmentId)
        ? prev.filter(e => e !== equipmentId)
        : [...prev, equipmentId]
    )
  }

  const addLane = () => {
    setPreferredLanes([...preferredLanes, { origin: '', destination: '' }])
  }

  const removeLane = (index: number) => {
    setPreferredLanes(preferredLanes.filter((_, i) => i !== index))
  }

  const updateLane = (index: number, field: 'origin' | 'destination', value: string) => {
    const updated = [...preferredLanes]
    updated[index][field] = value
    setPreferredLanes(updated)
  }

  const addContact = () => {
    setContacts([...contacts, { id: `new-${Date.now()}`, name: '', phone: '', email: '', isNew: true }])
  }

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id))
  }

  const updateContact = (id: string, field: keyof DriverContact, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleFileSelect = (type: 'insurance' | 'w9' | 'authority') => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
    }
  }

  // Canvas signature functions
  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    if (!canvasRef.current) return
    setIsDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.nativeEvent.offsetX
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.nativeEvent.offsetY

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setSignatureAccepted(false)
  }

  const acceptSignature = () => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // Check if canvas has any drawing
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
    const hasSignature = imageData.data.some((channel, index) => index % 4 === 3 && channel !== 0)

    if (hasSignature) {
      setSignatureAccepted(true)
    } else {
      alert('Please sign in the box above first.')
    }
  }

  const handleSubmit = async () => {
    if (!agreementRead || !signatureAccepted || !carrier) {
      alert('Please complete all required fields, read the agreement, and sign.')
      return
    }

    setSubmitting(true)
    try {
      // Get signature data
      const signatureData = canvasRef.current?.toDataURL('image/png') || ''

      // Upload documents if provided
      const uploadedFiles: Record<string, string> = {}

      for (const [type, file] of Object.entries(files)) {
        if (file) {
          const fileName = `carrier-onboarding/${carrier.id}/${type}_${Date.now()}_${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName)

          uploadedFiles[type] = publicUrl
        }
      }

      // Save onboarding data
      // In production, you'd save this to a carrier_onboarding table
      const onboardingData = {
        carrier_id: carrier.id,
        carrier_info: carrierInfo,
        w9_info: w9Info,
        accounting_info: accountingInfo,
        equipment_types: equipmentTypes,
        preferred_lanes: preferredLanes.filter(l => l.origin || l.destination),
        contacts: contacts,
        documents: uploadedFiles,
        signature_data: signatureData,
        signer_name: signerName,
        agreement_accepted: agreementRead,
        submitted_at: new Date().toISOString(),
      }

      // Update carrier status
      await supabase
        .from('carriers')
        .update({
          status: 'Onboarding Signed',
          contact_name: carrierInfo.primary_contact,
          contact_email: carrierInfo.email,
          contact_phone: carrierInfo.phone,
        })
        .eq('id', carrier.id)

      // Create/update drivers from contacts
      for (const contact of contacts) {
        if (contact.isNew && contact.name && contact.phone) {
          await supabase.from('drivers').insert({
            carrier_id: carrier.id,
            name: contact.name,
            phone: contact.phone,
          })
        } else if (!contact.isNew) {
          await supabase.from('drivers')
            .update({ name: contact.name, phone: contact.phone })
            .eq('id', contact.id)
        }
      }

      console.log('Onboarding data:', onboardingData)
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting:', err)
      alert('Error submitting onboarding. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link Invalid</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Onboarding Complete!</h2>
            <p className="text-muted-foreground">
              Thank you for completing your carrier onboarding. We will review your information and be in touch shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header Card with KHCL Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Truck className="h-12 w-12 text-white" />
                </div>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{carrier?.company_name}</h1>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p className="font-medium text-gray-700">KHCL Logistics LLC</p>
                  <p>174 Grandview Dr</p>
                  <p>Florence, MS 39073</p>
                  <p>MC# 123853</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex gap-2">
                <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Documents Required</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Please have your Insurance Certificate, W-9 form, and Operating Authority ready to upload.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carrier Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Carrier Information</CardTitle>
            <CardDescription>Please verify and update your company information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Company Name</Label>
                <Input
                  value={carrierInfo.name}
                  onChange={e => setCarrierInfo({...carrierInfo, name: e.target.value})}
                />
              </div>
              <div>
                <Label>MC#</Label>
                <Input
                  value={carrierInfo.mc_number}
                  onChange={e => setCarrierInfo({...carrierInfo, mc_number: e.target.value})}
                />
              </div>
              <div>
                <Label>DOT#</Label>
                <Input
                  value={carrierInfo.dot_number}
                  onChange={e => setCarrierInfo({...carrierInfo, dot_number: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Address 1</Label>
                <Input
                  value={carrierInfo.address1}
                  onChange={e => setCarrierInfo({...carrierInfo, address1: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Address 2</Label>
                <Input
                  value={carrierInfo.address2}
                  onChange={e => setCarrierInfo({...carrierInfo, address2: e.target.value})}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={carrierInfo.city}
                  onChange={e => setCarrierInfo({...carrierInfo, city: e.target.value})}
                />
              </div>
              <div>
                <Label>State</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={carrierInfo.state}
                  onChange={e => setCarrierInfo({...carrierInfo, state: e.target.value})}
                >
                  <option value="">Select...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Zip</Label>
                <Input
                  value={carrierInfo.zip}
                  onChange={e => setCarrierInfo({...carrierInfo, zip: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={carrierInfo.email}
                  onChange={e => setCarrierInfo({...carrierInfo, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={carrierInfo.website}
                  onChange={e => setCarrierInfo({...carrierInfo, website: e.target.value})}
                />
              </div>
              <div>
                <Label>Primary Contact</Label>
                <Input
                  value={carrierInfo.primary_contact}
                  onChange={e => setCarrierInfo({...carrierInfo, primary_contact: e.target.value})}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={carrierInfo.phone}
                  onChange={e => setCarrierInfo({...carrierInfo, phone: e.target.value})}
                />
              </div>
              <div>
                <Label>Fax</Label>
                <Input
                  value={carrierInfo.fax}
                  onChange={e => setCarrierInfo({...carrierInfo, fax: e.target.value})}
                />
              </div>
              <div>
                <Label>Cell</Label>
                <Input
                  value={carrierInfo.cell}
                  onChange={e => setCarrierInfo({...carrierInfo, cell: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* W-9 Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>W-9 Details</CardTitle>
            <CardDescription>Tax information for 1099 purposes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>W-9 Name</Label>
                <Input
                  value={w9Info.name}
                  onChange={e => setW9Info({...w9Info, name: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>W-9 DBA Name</Label>
                <Input
                  value={w9Info.dba_name}
                  onChange={e => setW9Info({...w9Info, dba_name: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>W-9 Address 1</Label>
                <Input
                  value={w9Info.address1}
                  onChange={e => setW9Info({...w9Info, address1: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>W-9 Address 2</Label>
                <Input
                  value={w9Info.address2}
                  onChange={e => setW9Info({...w9Info, address2: e.target.value})}
                />
              </div>
              <div>
                <Label>W-9 City</Label>
                <Input
                  value={w9Info.city}
                  onChange={e => setW9Info({...w9Info, city: e.target.value})}
                />
              </div>
              <div>
                <Label>W-9 State</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={w9Info.state}
                  onChange={e => setW9Info({...w9Info, state: e.target.value})}
                >
                  <option value="">Select...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>W-9 Zip</Label>
                <Input
                  value={w9Info.zip}
                  onChange={e => setW9Info({...w9Info, zip: e.target.value})}
                />
              </div>
              <div>
                <Label>Federal ID# (EIN/SSN)</Label>
                <Input
                  value={w9Info.federal_id}
                  onChange={e => setW9Info({...w9Info, federal_id: e.target.value})}
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounting Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Accounting Details</CardTitle>
            <CardDescription>Payment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Payee Name</Label>
                <Input
                  value={accountingInfo.payee_name}
                  onChange={e => setAccountingInfo({...accountingInfo, payee_name: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Payee Address 1</Label>
                <Input
                  value={accountingInfo.address1}
                  onChange={e => setAccountingInfo({...accountingInfo, address1: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Payee Address 2</Label>
                <Input
                  value={accountingInfo.address2}
                  onChange={e => setAccountingInfo({...accountingInfo, address2: e.target.value})}
                />
              </div>
              <div>
                <Label>Payee City</Label>
                <Input
                  value={accountingInfo.city}
                  onChange={e => setAccountingInfo({...accountingInfo, city: e.target.value})}
                />
              </div>
              <div>
                <Label>Payee State</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={accountingInfo.state}
                  onChange={e => setAccountingInfo({...accountingInfo, state: e.target.value})}
                >
                  <option value="">Select...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Payee Zip</Label>
                <Input
                  value={accountingInfo.zip}
                  onChange={e => setAccountingInfo({...accountingInfo, zip: e.target.value})}
                />
              </div>
              <div>
                <Label>Payee Phone</Label>
                <Input
                  value={accountingInfo.phone}
                  onChange={e => setAccountingInfo({...accountingInfo, phone: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Payee Email</Label>
                <Input
                  type="email"
                  value={accountingInfo.email}
                  onChange={e => setAccountingInfo({...accountingInfo, email: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Note</Label>
                <Textarea
                  value={accountingInfo.note}
                  onChange={e => setAccountingInfo({...accountingInfo, note: e.target.value})}
                  placeholder="Any special payment instructions..."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Equipment Types Card */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Types</CardTitle>
            <CardDescription>Select all equipment types you operate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {EQUIPMENT_TYPES.map(equipment => (
                <label
                  key={equipment.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    equipmentTypes.includes(equipment.id)
                      ? 'bg-blue-50 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={equipmentTypes.includes(equipment.id)}
                    onCheckedChange={() => handleEquipmentToggle(equipment.id)}
                  />
                  <span className="text-sm">{equipment.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preferred Lanes Card */}
        <Card>
          <CardHeader>
            <CardTitle>Preferred Lanes</CardTitle>
            <CardDescription>Enter your preferred operating lanes (origin to destination)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {preferredLanes.map((lane, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Origin (city/state)"
                  value={lane.origin}
                  onChange={e => updateLane(index, 'origin', e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  placeholder="Destination (city/state)"
                  value={lane.destination}
                  onChange={e => updateLane(index, 'destination', e.target.value)}
                  className="flex-1"
                />
                {preferredLanes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLane(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" onClick={addLane} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Lane
            </Button>
          </CardContent>
        </Card>

        {/* Contacts Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts / Drivers</CardTitle>
            <CardDescription>Add or edit driver contacts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">
                    {contact.isNew ? 'New Contact' : 'Existing Driver'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeContact(contact.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={contact.name}
                      onChange={e => updateContact(contact.id, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={contact.phone}
                      onChange={e => updateContact(contact.id, 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={e => updateContact(contact.id, 'email', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {contacts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No contacts added yet
              </p>
            )}

            <Button variant="outline" onClick={addContact} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </CardContent>
        </Card>

        {/* Document Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Document Upload</CardTitle>
            <CardDescription>Upload required documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Insurance Certificate */}
            <div className="space-y-2">
              <Label>Insurance Certificate</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  id="insurance-input"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect('insurance')}
                  className="hidden"
                />
                {files.insurance ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-5 w-5 text-green-600" />
                      <span className="text-sm">{files.insurance.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles(p => ({...p, insurance: null}))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="insurance-input" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload insurance certificate</span>
                  </label>
                )}
              </div>
            </div>

            {/* W-9 */}
            <div className="space-y-2">
              <Label>W-9 Form</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  id="w9-input"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect('w9')}
                  className="hidden"
                />
                {files.w9 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-5 w-5 text-green-600" />
                      <span className="text-sm">{files.w9.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles(p => ({...p, w9: null}))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="w9-input" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload W-9</span>
                  </label>
                )}
              </div>
            </div>

            {/* Operating Authority */}
            <div className="space-y-2">
              <Label>Operating Authority</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  id="authority-input"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect('authority')}
                  className="hidden"
                />
                {files.authority ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-5 w-5 text-green-600" />
                      <span className="text-sm">{files.authority.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles(p => ({...p, authority: null}))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="authority-input" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload operating authority</span>
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement and Signature Card */}
        <Card>
          <CardHeader>
            <CardTitle>Broker-Carrier Agreement</CardTitle>
            <CardDescription>Please review and sign the agreement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2">Instructions:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800">
                <li>Click the link below to review the Broker-Carrier Agreement</li>
                <li>Sign your name in the signature box using your finger or mouse</li>
                <li>Click &ldquo;Accept Signature&rdquo; to confirm your signature</li>
                <li>Tap the &ldquo;Save & Submit&rdquo; button to complete onboarding</li>
              </ol>
            </div>

            {/* Agreement Link */}
            <div className="space-y-2">
              <a
                href="/broker-carrier-agreement.pdf"
                target="_blank"
                className="flex items-center gap-2 text-blue-600 hover:underline font-medium"
              >
                <ExternalLink className="h-4 w-4" />
                View Broker-Carrier Agreement (PDF)
              </a>
              <p className="text-xs text-muted-foreground">
                This document must be reviewed before signing below.
              </p>
            </div>

            {/* Agreement Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreementRead}
                onCheckedChange={(checked) => setAgreementRead(checked as boolean)}
                className="mt-1"
              />
              <span className="text-sm">
                I have read and agree to the terms of the Broker-Carrier Agreement. I understand that by signing below,
                I am entering into a binding agreement with KHCL Logistics LLC.
              </span>
            </label>

            {/* Signer Name */}
            <div className="space-y-2">
              <Label>Your Full Name (Print)</Label>
              <Input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Enter your full legal name"
              />
            </div>

            {/* Signature Canvas */}
            <div className="space-y-2">
              <Label>Signature</Label>
              <div className={`border-2 ${signatureAccepted ? 'border-green-500 bg-green-50' : 'border-dashed'} rounded-lg p-1 bg-white`}>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={150}
                  className="w-full touch-none cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  Clear
                </Button>
                <Button
                  variant={signatureAccepted ? "default" : "secondary"}
                  size="sm"
                  onClick={acceptSignature}
                  disabled={signatureAccepted}
                >
                  {signatureAccepted ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Signature Accepted
                    </>
                  ) : (
                    'Accept Signature'
                  )}
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full"
              size="lg"
              disabled={!agreementRead || !signatureAccepted || !signerName.trim() || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save & Submit
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground pb-8">
          Your information is securely transmitted and stored.
          <br />
          Need help? Contact us at (601) 497-5160 or dispatch@khcllogistics.com
        </p>
      </div>
    </div>
  )
}
