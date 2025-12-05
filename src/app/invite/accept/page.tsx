'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, Truck } from 'lucide-react'

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'creating'

interface InviteDetails {
  email: string
  full_name: string | null
  role: string
  organization_name?: string
  customer_name?: string
  expires_at: string
}

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const token = searchParams.get('token')
  const type = searchParams.get('type') || 'staff'

  const [status, setStatus] = useState<InviteStatus>('loading')
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setError('No invite token provided')
      return
    }

    checkInvite()
  }, [token, type])

  async function checkInvite() {
    try {
      if (type === 'customer') {
        const { data: invite, error } = await supabase
          .from('customer_user_invites')
          .select('*, customer:customers(company_name)')
          .eq('token', token)
          .single()

        if (error || !invite) {
          setStatus('invalid')
          setError('Invite not found')
          return
        }

        if (invite.accepted_at) {
          setStatus('accepted')
          return
        }

        if (new Date(invite.expires_at) < new Date()) {
          setStatus('expired')
          return
        }

        setInvite({
          email: invite.email,
          full_name: invite.full_name,
          role: invite.role,
          customer_name: invite.customer?.company_name,
          expires_at: invite.expires_at,
        })
        setStatus('valid')
      } else {
        const { data: invite, error } = await supabase
          .from('staff_invites')
          .select('*, organization:organizations(name)')
          .eq('token', token)
          .single()

        if (error || !invite) {
          setStatus('invalid')
          setError('Invite not found')
          return
        }

        if (invite.accepted_at) {
          setStatus('accepted')
          return
        }

        if (new Date(invite.expires_at) < new Date()) {
          setStatus('expired')
          return
        }

        setInvite({
          email: invite.email,
          full_name: invite.full_name,
          role: invite.role,
          organization_name: invite.organization?.name,
          expires_at: invite.expires_at,
        })
        setStatus('valid')
      }
    } catch (err) {
      setStatus('invalid')
      setError('Failed to verify invite')
    }
  }

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!invite) return

    setStatus('creating')

    try {
      // Sign up the user - the database trigger will handle linking to invite
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            full_name: invite.full_name,
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      // Redirect based on type
      if (type === 'customer') {
        router.push('/portal')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err) {
      setStatus('valid')
      setError(err instanceof Error ? err.message : 'Failed to create account')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-500">Verifying invite...</p>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
            <p className="text-gray-500">{error || 'This invite link is not valid.'}</p>
            <Button className="mt-6" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <XCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invite Expired</h2>
            <p className="text-gray-500">
              This invite link has expired. Please contact the person who invited you for a new link.
            </p>
            <Button className="mt-6" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Already Accepted</h2>
            <p className="text-gray-500">
              This invite has already been accepted. You can sign in with your account.
            </p>
            <Button className="mt-6" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Truck className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Accept Invite</CardTitle>
          <CardDescription>
            {type === 'customer'
              ? `You've been invited to access ${invite?.customer_name}'s portal`
              : `You've been invited to join ${invite?.organization_name}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium">{invite?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role:</span>
                <span className="font-medium capitalize">{invite?.role}</span>
              </div>
              {invite?.full_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium">{invite.full_name}</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={status === 'creating'}>
              {status === 'creating' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Accept & Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
