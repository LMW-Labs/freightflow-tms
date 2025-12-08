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

  try {
    // Get the integration
    const { data: integration, error: fetchError } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('provider', provider)
      .single()

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    if (integration.status !== 'connected') {
      return NextResponse.json(
        { error: 'Integration is not connected' },
        { status: 400 }
      )
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('integration_sync_logs')
      .insert({
        organization_id: userData.organization_id,
        integration_id: integration.id,
        operation: 'manual_sync',
        direction: 'pull',
        status: 'running',
        triggered_by: user.id,
        trigger_type: 'manual',
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating sync log:', logError)
    }

    // Execute sync based on provider
    let syncResult: { success: boolean; message: string; itemsProcessed?: number }

    switch (provider as IntegrationProvider) {
      case 'quickbooks':
        syncResult = await syncQuickBooks(supabase, integration, userData.organization_id)
        break
      case 'dat':
      case 'truckstop':
        syncResult = { success: true, message: 'Load board sync not yet implemented' }
        break
      case 'highway':
        syncResult = await syncHighway(supabase, integration, userData.organization_id)
        break
      case 'macropoint':
        syncResult = { success: true, message: 'Tracking sync not yet implemented' }
        break
      case 'denim':
        syncResult = { success: true, message: 'Payment sync not yet implemented' }
        break
      default:
        syncResult = { success: false, message: 'Unknown provider' }
    }

    // Update sync log
    if (syncLog) {
      const completedAt = new Date().toISOString()
      await supabase
        .from('integration_sync_logs')
        .update({
          status: syncResult.success ? 'success' : 'error',
          completed_at: completedAt,
          duration_ms: Date.now() - new Date(syncLog.started_at).getTime(),
          error_message: syncResult.success ? null : syncResult.message,
          response_summary: {
            items_processed: syncResult.itemsProcessed || 0,
            message: syncResult.message,
          },
        })
        .eq('id', syncLog.id)
    }

    // Update integration last sync
    await supabase
      .from('organization_integrations')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: syncResult.success ? 'success' : 'error',
        last_sync_message: syncResult.message,
      })
      .eq('id', integration.id)

    return NextResponse.json({
      success: syncResult.success,
      message: syncResult.message,
      itemsProcessed: syncResult.itemsProcessed,
    })
  } catch (error) {
    console.error('Error syncing integration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Provider-specific sync functions (to be expanded)
async function syncQuickBooks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  integration: Record<string, unknown>,
  organizationId: string
): Promise<{ success: boolean; message: string; itemsProcessed?: number }> {
  // TODO: Implement QuickBooks sync
  // - Sync customers from our Customers table -> QBO Customers
  // - Pull payment status back to update our records
  return {
    success: true,
    message: 'QuickBooks sync placeholder - full implementation pending',
    itemsProcessed: 0,
  }
}

async function syncHighway(
  supabase: Awaited<ReturnType<typeof createClient>>,
  integration: Record<string, unknown>,
  organizationId: string
): Promise<{ success: boolean; message: string; itemsProcessed?: number }> {
  // TODO: Implement Highway sync
  // - Re-verify carriers that need verification
  // - Update carrier verification status

  // For now, return placeholder
  return {
    success: true,
    message: 'Highway carrier verification sync placeholder - full implementation pending',
    itemsProcessed: 0,
  }
}
