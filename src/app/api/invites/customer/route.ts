import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List pending customer user invites for a specific customer
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customer_id')

  // Build query
  let query = supabase
    .from('customer_user_invites')
    .select('*, customer:customers(company_name), invited_by_user:users!invited_by(full_name)')
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data: invites, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invites })
}

// POST - Create a new customer user invite
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { customer_id, email, full_name, role } = body

  if (!customer_id) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  if (role && !['admin', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Verify customer belongs to user's organization
  const { data: customer } = await supabase
    .from('customers')
    .select('id, company_name')
    .eq('id', customer_id)
    .single()

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Check if customer user already exists
  const { data: existingUser } = await supabase
    .from('customer_users')
    .select('id')
    .eq('email', email)
    .eq('customer_id', customer_id)
    .single()

  if (existingUser) {
    return NextResponse.json({ error: 'User with this email already exists for this customer' }, { status: 400 })
  }

  // Check if invite already pending
  const { data: existingInvite } = await supabase
    .from('customer_user_invites')
    .select('id')
    .eq('email', email)
    .eq('customer_id', customer_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvite) {
    return NextResponse.json({ error: 'Invite already pending for this email' }, { status: 400 })
  }

  // Create invite
  const { data: invite, error } = await supabase
    .from('customer_user_invites')
    .insert({
      customer_id,
      email,
      full_name,
      role: role || 'viewer',
      invited_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate invite URL
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${invite.token}&type=customer`

  return NextResponse.json({
    invite,
    inviteUrl,
    message: `Invite created for ${customer.company_name}. Share this link with ${email}: ${inviteUrl}`,
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

  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('id')

  if (!inviteId) {
    return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('customer_user_invites')
    .delete()
    .eq('id', inviteId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
