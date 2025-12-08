'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { Loader2, UserCog } from 'lucide-react'
import { toast } from 'sonner'

interface ChangeRoleDialogProps {
  userId: string
  userName: string
  currentRole: string
  isCurrentUser: boolean
}

const roles = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features and settings' },
  { value: 'broker', label: 'Broker', description: 'Manage loads, customers, and carriers' },
  { value: 'accountant', label: 'Accountant', description: 'View loads, manage invoices and billing' },
]

export function ChangeRoleDialog({ userId, userName, currentRole, isCurrentUser }: ChangeRoleDialogProps) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState(currentRole)

  const handleChangeRole = async () => {
    if (selectedRole === currentRole) {
      setOpen(false)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('id', userId)

      if (error) throw error

      toast.success(`${userName}'s role updated to ${selectedRole}`)
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error changing role:', error)
      toast.error('Failed to change role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Change role">
          <UserCog className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Change the role for {userName}
            {isCurrentUser && (
              <span className="block mt-1 text-orange-600">
                Warning: You are changing your own role
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex flex-col">
                      <span>{role.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium">Role Permissions:</p>
            {roles.map((role) => (
              <div
                key={role.value}
                className={`text-sm p-2 rounded ${
                  selectedRole === role.value ? 'bg-background border' : ''
                }`}
              >
                <span className="font-medium">{role.label}:</span>{' '}
                <span className="text-muted-foreground">{role.description}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleChangeRole} disabled={loading || selectedRole === currentRole}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {loading ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
