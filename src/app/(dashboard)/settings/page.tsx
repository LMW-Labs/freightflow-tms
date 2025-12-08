'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, Building2, Palette, Mail, FileText, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { StatusColorsTab } from './StatusColorsTab'

// Default status colors
const defaultStatusColors: Record<string, string> = {
  quoted: '#6B7280',
  booked: '#3B82F6',
  dispatched: '#8B5CF6',
  en_route_pickup: '#F59E0B',
  at_pickup: '#F97316',
  in_transit: '#06B6D4',
  at_delivery: '#10B981',
  delivered: '#22C55E',
  invoiced: '#6366F1',
  paid: '#059669',
  cancelled: '#EF4444',
}

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  // Extended fields we'll add
  address?: string
  city?: string
  state?: string
  zip?: string
  phone?: string
  email?: string
  mc_number?: string
  dot_number?: string
  default_payment_terms?: string
  invoice_notes?: string
  status_colors?: Record<string, string>
}

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [statusColors, setStatusColors] = useState<Record<string, string>>(defaultStatusColors)

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id, role')
        .eq('id', user.id)
        .single()

      if (userData?.organization_id) {
        setUserRole(userData.role)
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', userData.organization_id)
          .single()

        if (org) {
          setOrganization(org)
          // Load status colors if they exist
          if (org.status_colors) {
            setStatusColors({ ...defaultStatusColors, ...org.status_colors })
          }
        }
      }
      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const handleSave = async () => {
    if (!organization) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          logo_url: organization.logo_url,
          primary_color: organization.primary_color,
          address: organization.address,
          city: organization.city,
          state: organization.state,
          zip: organization.zip,
          phone: organization.phone,
          email: organization.email,
          mc_number: organization.mc_number,
          dot_number: organization.dot_number,
          default_payment_terms: organization.default_payment_terms,
          invoice_notes: organization.invoice_notes,
          status_colors: statusColors,
        })
        .eq('id', organization.id)

      if (error) throw error

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    )
  }

  const isAdmin = userRole === 'admin'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your organization settings
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        )}
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="statuses">
            <Tag className="h-4 w-4 mr-2" />
            Status Colors
          </TabsTrigger>
          <TabsTrigger value="billing">
            <FileText className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Mail className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Company Info */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Your company details used on invoices, rate confirmations, and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={organization.name}
                    onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL identifier)</Label>
                  <Input
                    value={organization.slug}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={organization.address || ''}
                  onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
                  placeholder="123 Main Street"
                  disabled={!isAdmin}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>City</Label>
                  <Input
                    value={organization.city || ''}
                    onChange={(e) => setOrganization({ ...organization, city: e.target.value })}
                    placeholder="City"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={organization.state || ''}
                    onChange={(e) => setOrganization({ ...organization, state: e.target.value })}
                    placeholder="State"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input
                    value={organization.zip || ''}
                    onChange={(e) => setOrganization({ ...organization, zip: e.target.value })}
                    placeholder="12345"
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={organization.phone || ''}
                    onChange={(e) => setOrganization({ ...organization, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={organization.email || ''}
                    onChange={(e) => setOrganization({ ...organization, email: e.target.value })}
                    placeholder="contact@company.com"
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>MC Number</Label>
                  <Input
                    value={organization.mc_number || ''}
                    onChange={(e) => setOrganization({ ...organization, mc_number: e.target.value })}
                    placeholder="MC-123456"
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>DOT Number</Label>
                  <Input
                    value={organization.dot_number || ''}
                    onChange={(e) => setOrganization({ ...organization, dot_number: e.target.value })}
                    placeholder="1234567"
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize how your company appears to customers and carriers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={organization.logo_url || ''}
                  onChange={(e) => setOrganization({ ...organization, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to your company logo. Recommended size: 200x200px
                </p>
              </div>

              {organization.logo_url && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-muted">
                    <img
                      src={organization.logo_url}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={organization.primary_color}
                    onChange={(e) => setOrganization({ ...organization, primary_color: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                    disabled={!isAdmin}
                  />
                  <Input
                    value={organization.primary_color}
                    onChange={(e) => setOrganization({ ...organization, primary_color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                    disabled={!isAdmin}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for buttons, links, and accents in customer portal
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Colors */}
        <TabsContent value="statuses">
          <StatusColorsTab
            statusColors={statusColors}
            onChange={setStatusColors}
            disabled={!isAdmin}
          />
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Defaults</CardTitle>
              <CardDescription>
                Default settings for invoices and payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Payment Terms</Label>
                <Input
                  value={organization.default_payment_terms || ''}
                  onChange={(e) => setOrganization({ ...organization, default_payment_terms: e.target.value })}
                  placeholder="Net 30"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Default payment terms shown on invoices
                </p>
              </div>

              <div className="space-y-2">
                <Label>Invoice Notes</Label>
                <textarea
                  value={organization.invoice_notes || ''}
                  onChange={(e) => setOrganization({ ...organization, invoice_notes: e.target.value })}
                  placeholder="Thank you for your business!"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md bg-background"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-muted-foreground">
                  Default notes shown at the bottom of invoices
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure when you receive email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">New Load Requests</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when a customer submits a load request
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" disabled={!isAdmin} />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Carrier Onboarding</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when a carrier completes onboarding
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" disabled={!isAdmin} />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Document Uploads</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when documents are uploaded (BOL, POD)
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4" disabled={!isAdmin} />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Load Status Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when load status changes
                  </p>
                </div>
                <input type="checkbox" className="h-4 w-4" disabled={!isAdmin} />
              </div>
              <p className="text-sm text-muted-foreground pt-4">
                Note: Email notification preferences coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!isAdmin && (
        <p className="text-sm text-muted-foreground text-center">
          Only administrators can modify settings
        </p>
      )}
    </div>
  )
}
