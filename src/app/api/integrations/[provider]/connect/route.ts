import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/integrations/core/encryption'
import {
  INTEGRATION_CONFIGS,
  type IntegrationProvider,
} from '@/lib/integrations/core/types'

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

  const config = INTEGRATION_CONFIGS[provider as IntegrationProvider]

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

  // Handle OAuth providers differently
  if (config.authType === 'oauth2') {
    // For OAuth, redirect to the OAuth authorization URL
    // This will be handled by specific provider routes
    return NextResponse.json(
      { error: 'Use the OAuth flow for this provider' },
      { status: 400 }
    )
  }

  // Handle API key authentication
  try {
    const body = await request.json()
    const { api_key, api_secret, account_id, username, password } = body

    if (!api_key) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Build credentials object based on provider requirements
    const credentials: Record<string, string> = { api_key }

    if (api_secret) {
      credentials.api_secret = api_secret
    }
    if (account_id) {
      credentials.account_id = account_id
    }
    if (username) {
      credentials.username = username
    }
    if (password) {
      credentials.password = password
    }

    // Encrypt credentials
    const encryptedCredentials = encrypt(JSON.stringify(credentials))

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('organization_integrations')
      .select('id')
      .eq('organization_id', userData.organization_id)
      .eq('provider', provider)
      .single()

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('organization_integrations')
        .update({
          status: 'connected',
          credentials_encrypted: encryptedCredentials,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null,
          error_count: 0,
        })
        .eq('id', existingIntegration.id)

      if (updateError) {
        console.error('Error updating integration:', updateError)
        return NextResponse.json(
          { error: 'Failed to update integration' },
          { status: 500 }
        )
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('organization_integrations')
        .insert({
          organization_id: userData.organization_id,
          provider,
          status: 'connected',
          credentials_encrypted: encryptedCredentials,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error creating integration:', insertError)
        return NextResponse.json(
          { error: 'Failed to create integration' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error connecting integration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET handler for OAuth providers - initiates OAuth flow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const supabase = await createClient()

  // Validate provider
  if (!VALID_PROVIDERS.includes(provider as IntegrationProvider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const config = INTEGRATION_CONFIGS[provider as IntegrationProvider]

  if (config.authType !== 'oauth2') {
    return NextResponse.json(
      { error: 'This provider does not use OAuth' },
      { status: 400 }
    )
  }

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get user's organization and role
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'broker'].includes(userData.role)) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=unauthorized', request.url)
    )
  }

  // Build OAuth authorization URL based on provider
  if (provider === 'quickbooks') {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI

    if (!clientId || !redirectUri) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=not_configured', request.url)
      )
    }

    // Store state for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        organizationId: userData.organization_id,
        userId: user.id,
        timestamp: Date.now(),
      })
    ).toString('base64')

    const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'com.intuit.quickbooks.accounting')
    authUrl.searchParams.set('state', state)

    return NextResponse.redirect(authUrl)
  }

  // Add other OAuth providers here as needed
  return NextResponse.json(
    { error: 'OAuth not implemented for this provider' },
    { status: 501 }
  )
}
