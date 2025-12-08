import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/integrations/core/encryption'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const realmId = searchParams.get('realmId')
  const error = searchParams.get('error')

  const supabase = await createClient()

  // Handle OAuth errors
  if (error) {
    console.error('QuickBooks OAuth error:', error)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=oauth_denied', request.url)
    )
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=missing_params', request.url)
    )
  }

  try {
    // Decode and validate state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const { organizationId, userId, timestamp } = stateData

    // Check state isn't too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=state_expired', request.url)
      )
    }

    // Verify user is still authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=auth_mismatch', request.url)
      )
    }

    // Exchange code for tokens
    const clientId = process.env.QUICKBOOKS_CLIENT_ID
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=not_configured', request.url)
      )
    }

    const tokenResponse = await fetch(
      'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      }
    )

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(
        new URL('/settings/integrations?error=token_exchange', request.url)
      )
    }

    const tokens = await tokenResponse.json()

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = encrypt(tokens.refresh_token)

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Get company info from QuickBooks
    let companyName = 'QuickBooks Company'
    try {
      const companyResponse = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            Accept: 'application/json',
          },
        }
      )

      if (companyResponse.ok) {
        const companyData = await companyResponse.json()
        companyName = companyData.CompanyInfo?.CompanyName || companyName
      }
    } catch (companyError) {
      console.error('Error fetching company info:', companyError)
    }

    // Check if integration exists
    const { data: existingIntegration } = await supabase
      .from('organization_integrations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('provider', 'quickbooks')
      .single()

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('organization_integrations')
        .update({
          status: 'connected',
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt,
          external_account_id: realmId,
          external_account_name: companyName,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null,
          error_count: 0,
        })
        .eq('id', existingIntegration.id)

      if (updateError) {
        console.error('Error updating integration:', updateError)
        return NextResponse.redirect(
          new URL('/settings/integrations?error=db_error', request.url)
        )
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('organization_integrations')
        .insert({
          organization_id: organizationId,
          provider: 'quickbooks',
          status: 'connected',
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt,
          external_account_id: realmId,
          external_account_name: companyName,
          connected_by: user.id,
          connected_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error creating integration:', insertError)
        return NextResponse.redirect(
          new URL('/settings/integrations?error=db_error', request.url)
        )
      }
    }

    // Create sync log for initial connection
    await supabase.from('integration_sync_logs').insert({
      organization_id: organizationId,
      integration_id: existingIntegration?.id,
      operation: 'oauth_connect',
      direction: 'push',
      status: 'success',
      triggered_by: user.id,
      trigger_type: 'manual',
      completed_at: new Date().toISOString(),
      response_summary: {
        realm_id: realmId,
        company_name: companyName,
      },
    })

    return NextResponse.redirect(
      new URL('/settings/integrations?success=quickbooks', request.url)
    )
  } catch (error) {
    console.error('QuickBooks callback error:', error)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=unknown', request.url)
    )
  }
}
