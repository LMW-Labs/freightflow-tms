'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Loader2, CheckCircle, Copy, ExternalLink, Mail, PartyPopper } from 'lucide-react'
import Link from 'next/link'

export default function NewCustomerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdCustomer, setCreatedCustomer] = useState<{ id: string; slug: string; company_name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    // Company Info
    company_name: '',
    slug: '',
    // Primary Contact
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    // Physical Address
    address: '',
    city: '',
    state: '',
    zip: '',
    // Billing Address
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_same_as_physical: true,
    // Additional Info
    notes: '',
    // Portal Settings
    portal_enabled: true,
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleCompanyNameChange = (value: string) => {
    setFormData({
      ...formData,
      company_name: value,
      slug: generateSlug(value),
    })
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

      // Check if slug is unique
      let slug = formData.slug
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('slug', slug)
        .single()

      if (existing) {
        // Add timestamp to make slug unique
        slug = `${formData.slug}-${Date.now()}`
      }

      // Use physical address for billing if same
      const billingAddress = formData.billing_same_as_physical ? formData.address : formData.billing_address
      const billingCity = formData.billing_same_as_physical ? formData.city : formData.billing_city
      const billingState = formData.billing_same_as_physical ? formData.state : formData.billing_state
      const billingZip = formData.billing_same_as_physical ? formData.zip : formData.billing_zip

      const { data: newCustomer, error } = await supabase.from('customers').insert({
        organization_id: userData.organization_id,
        company_name: formData.company_name,
        slug: slug,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
        billing_address: billingAddress || null,
        billing_city: billingCity || null,
        billing_state: billingState || null,
        billing_zip: billingZip || null,
        notes: formData.notes || null,
        portal_enabled: formData.portal_enabled,
      }).select().single()

      if (error) throw error

      // Show success dialog instead of redirecting
      setCreatedCustomer({
        id: newCustomer.id,
        slug: slug,
        company_name: formData.company_name,
      })
      setShowSuccess(true)
    } catch (error) {
      console.error('Error creating customer:', error)
      alert('Error creating customer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const portalUrl = createdCustomer
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${createdCustomer.slug}`
    : ''

  const copyPortalUrl = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <PartyPopper className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Customer Created!
            </DialogTitle>
            <DialogDescription className="text-center">
              {createdCustomer?.company_name} is ready to go. Share their portal link or invite them directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Portal URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Customer Portal URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={portalUrl}
                  className="bg-gray-50 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyPortalUrl}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => window.open(`/portal/${createdCustomer?.slug}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Portal
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccess(false)
                  router.push(`/customers?invite=${createdCustomer?.id}`)
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>

            <div className="pt-4 border-t">
              <Button
                className="w-full"
                onClick={() => {
                  setShowSuccess(false)
                  router.push('/customers')
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Customer
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Create a new customer with portal access
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  required
                  value={formData.company_name}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  placeholder="Acme Shipping Inc."
                />
              </div>
              <div className="space-y-2">
                <Label>Portal URL Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">/portal/</span>
                  <Input
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="acme-shipping"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Primary Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                placeholder="John Smith"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                  placeholder="john@acme.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_phone: e.target.value })
                  }
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Address */}
        <Card>
          <CardHeader>
            <CardTitle>Physical Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({ ...formData, zip: e.target.value })
                  }
                  placeholder="12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Billing Address</CardTitle>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.billing_same_as_physical}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, billing_same_as_physical: checked })
                  }
                />
                <Label className="text-sm text-gray-500">Same as physical</Label>
              </div>
            </div>
          </CardHeader>
          {!formData.billing_same_as_physical && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={formData.billing_address}
                  onChange={(e) =>
                    setFormData({ ...formData, billing_address: e.target.value })
                  }
                  placeholder="123 Billing St"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>City</Label>
                  <Input
                    value={formData.billing_city}
                    onChange={(e) =>
                      setFormData({ ...formData, billing_city: e.target.value })
                    }
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={formData.billing_state}
                    onChange={(e) =>
                      setFormData({ ...formData, billing_state: e.target.value })
                    }
                    placeholder="State"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input
                    value={formData.billing_zip}
                    onChange={(e) =>
                      setFormData({ ...formData, billing_zip: e.target.value })
                    }
                    placeholder="12345"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes about this customer..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Portal Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Portal Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Customer Portal</Label>
                <p className="text-sm text-gray-500">
                  Allow this customer to access their shipment portal
                </p>
              </div>
              <Switch
                checked={formData.portal_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, portal_enabled: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" asChild>
            <Link href="/customers">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Customer
          </Button>
        </div>
      </form>
    </div>
  )
}
