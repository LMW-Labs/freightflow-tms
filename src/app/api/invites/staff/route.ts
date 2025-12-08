import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET - List pending staff invites for the organization
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can view invites' }, { status: 403 })
  }

  const { data: invites, error } = await supabase
    .from('staff_invites')
    .select('*, invited_by_user:users!invited_by(full_name)')
    .eq('organization_id', currentUser.organization_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invites })
}

// POST - Create a new staff invite
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can invite staff' }, { status: 403 })
  }

  const body = await request.json()
  const { email, full_name, role } = body

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const validRoles = ['admin', 'broker', 'dispatcher', 'salesperson_1', 'salesperson_2', 'accountant']
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
  }

  // Check if invite already pending
  const { data: existingInvite } = await supabase
    .from('staff_invites')
    .select('id')
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvite) {
    return NextResponse.json({ error: 'Invite already pending for this email' }, { status: 400 })
  }

  // Create invite
  const { data: invite, error } = await supabase
    .from('staff_invites')
    .insert({
      organization_id: currentUser.organization_id,
      email,
      full_name,
      role: role || 'broker',
      invited_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate invite URL
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${invite.token}`

  return NextResponse.json({
    invite,
    inviteUrl,
    message: `Invite created. Share this link with ${email}: ${inviteUrl}`,
  })
}

// DELETE - Cancel/revoke an invite
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const { data: currentUser } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can revoke invites' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('id')

  if (!inviteId) {
    return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('staff_invites')
    .delete()
    .eq('id', inviteId)
    .eq('organization_id', currentUser.organization_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
