import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type IntegrationProvider } from '@/lib/integrations/core/types'

const VALID_PROVIDERS: IntegrationProvider[] = [
  'quickbooks',
  'dat',
  'truckstop',
  'highway',
  'macropoint',
  'denim',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const supabase = await createClient()

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider as IntegrationProvider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's organization and role
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Check permission
  if (!['admin', 'broker'].includes(userData.role)) {
    return NextResponse.json(
      { error: 'Only admins and brokers can manage integrations' },
      { status: 403 }
    )
  }

  try {
    // Update integration to disconnected status and clear credentials
    const { error: updateError } = await supabase
      .from('organization_integrations')
      .update({
        status: 'disconnected',
        credentials_encrypted: null,
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        token_expires_at: null,
        external_account_id: null,
        external_account_name: null,
        last_sync_at: null,
        last_sync_status: null,
        last_sync_message: null,
      })
      .eq('organization_id', userData.organization_id)
      .eq('provider', provider)

    if (updateError) {
      console.error('Error disconnecting integration:', updateError)
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting integration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
