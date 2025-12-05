import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Get current user from auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({
      error: 'Not authenticated',
      authError,
      user: null
    })
  }

  // Check if user exists in users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Try to get loads count (will show if RLS is blocking)
  const { count: loadsCount, error: loadsError } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })

  // Try to get customers count
  const { count: customersCount, error: customersError } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    auth_user: {
      id: user.id,
      email: user.email,
    },
    users_table: {
      data: userData,
      error: userError?.message,
    },
    loads: {
      count: loadsCount,
      error: loadsError?.message,
    },
    customers: {
      count: customersCount,
      error: customersError?.message,
    },
  })
}
