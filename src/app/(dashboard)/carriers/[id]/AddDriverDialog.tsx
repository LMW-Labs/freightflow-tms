'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Loader2 } from 'lucide-react'

interface AddDriverDialogProps {
  carrierId: string
  carrierName: string
}

export function AddDriverDialog({ carrierId, carrierName }: AddDriverDialogProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    phone: '',
    email: '',
    // License Info
    license_number: '',
    license_state: '',
    license_expiration: '',
    // Equipment
    truck_number: '',
    trailer_number: '',
    // Additional
    notes: '',
    status: 'active',
  })

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      license_number: '',
      license_state: '',
      license_expiration: '',
      truck_number: '',
      trailer_number: '',
      notes: '',
      status: 'active',
    })
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Format phone - remove all non-digits
      const cleanPhone = formData.phone.replace(/\D/g, '')

      if (cleanPhone.length < 10) {
        throw new Error('Please enter a valid phone number')
      }

      const { error: insertError } = await supabase.from('drivers').insert({
        carrier_id: carrierId,
        name: formData.name || null,
        phone: cleanPhone,
        email: formData.email || null,
        license_number: formData.license_number || null,
        license_state: formData.license_state || null,
        license_expiration: formData.license_expiration || null,
        truck_number: formData.truck_number || null,
        trailer_number: formData.trailer_number || null,
        notes: formData.notes || null,
        status: formData.status,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('A driver with this phone number already exists')
        }
        throw insertError
      }

      setOpen(false)
      resetForm()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Driver</DialogTitle>
          <DialogDescription>
            Add a new driver to {carrierName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Driver Name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="driver@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <p className="text-xs text-gray-500">
              Driver will use the phone number to log into the driver app
            </p>
          </div>

          {/* License Information */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">License Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  placeholder="DL123456"
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_state">State</Label>
                <Input
                  id="license_state"
                  placeholder="TX"
                  maxLength={2}
                  value={formData.license_state}
                  onChange={(e) => setFormData({ ...formData, license_state: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_expiration">Expiration</Label>
                <Input
                  id="license_expiration"
                  type="date"
                  value={formData.license_expiration}
                  onChange={(e) => setFormData({ ...formData, license_expiration: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Equipment</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="truckNumber">Truck Number</Label>
                <Input
                  id="truckNumber"
                  placeholder="TRK-001"
                  value={formData.truck_number}
                  onChange={(e) => setFormData({ ...formData, truck_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trailerNumber">Trailer Number</Label>
                <Input
                  id="trailerNumber"
                  placeholder="TRL-001"
                  value={formData.trailer_number}
                  onChange={(e) => setFormData({ ...formData, trailer_number: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Status and Notes */}
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Driver'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
