import { createClient } from '@/lib/supabase/server'
import {
  createMacropointClient,
  MacropointClient,
  type TrackingOrder,
  type MacropointLocation,
  type MacropointETA,
  type TrackingStatus,
} from './client'
import { IntegrationSyncLogger, updateIntegrationSyncStatus } from '../core/logger'

interface TrackingResult {
  success: boolean
  message: string
  trackingOrderId?: string
  trackingUrl?: string
  errors?: string[]
}

interface LocationUpdateResult {
  success: boolean
  location?: MacropointLocation
  eta?: MacropointETA
  status?: TrackingStatus
  message: string
}

/**
 * Start tracking for a load
 * Creates a Macropoint tracking order and associates it with the load
 */
export async function startLoadTracking(
  loadId: string,
  organizationId: string,
  triggeredBy?: string
): Promise<TrackingResult> {
  const supabase = await createClient()

  // Get integration
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'macropoint')
    .eq('status', 'connected')
    .single()

  if (!integration) {
    return {
      success: false,
      message: 'Macropoint integration not connected',
    }
  }

  const logger = new IntegrationSyncLogger({
    integrationId: integration.id,
    organizationId,
    operation: 'start_tracking',
    direction: 'push',
    relatedTable: 'loads',
    relatedId: loadId,
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  try {
    await logger.start()

    const client = await createMacropointClient(organizationId)
    if (!client) {
      throw new Error('Failed to create Macropoint client')
    }

    // Get load details with carrier and driver info
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select(`
        *,
        carrier:carriers(id, company_name, mc_number),
        driver:drivers(id, name, phone)
      `)
      .eq('id', loadId)
      .single()

    if (loadError || !load) {
      throw new Error(`Failed to fetch load: ${loadError?.message || 'Not found'}`)
    }

    if (!load.driver?.phone) {
      throw new Error('Driver phone number is required for tracking')
    }

    // Check if tracking already exists
    if (load.macropoint_order_id) {
      return {
        success: true,
        message: 'Tracking already active for this load',
        trackingOrderId: load.macropoint_order_id,
      }
    }

    // Create tracking order
    const result = await client.createTrackingOrder({
      external_id: load.reference_number || loadId,
      driver_phone: load.driver.phone,
      driver_name: load.driver.name,
      carrier_name: load.carrier?.company_name,
      carrier_mc: load.carrier?.mc_number,
      pickup: {
        address: load.origin_address,
        city: load.origin_city,
        state: load.origin_state,
        postal_code: load.origin_zip,
        latitude: load.origin_lat,
        longitude: load.origin_lng,
        appointment_start: load.pickup_date,
        appointment_end: load.pickup_end_date,
      },
      delivery: {
        address: load.dest_address,
        city: load.dest_city,
        state: load.dest_state,
        postal_code: load.dest_zip,
        latitude: load.dest_lat,
        longitude: load.dest_lng,
        appointment_start: load.delivery_date,
        appointment_end: load.delivery_end_date,
      },
      notification_webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/macropoint`,
    })

    if (!result.success || !result.data) {
      throw new Error(`Failed to create tracking order: ${result.error?.message || 'Unknown error'}`)
    }

    // Store Macropoint order ID on the load
    await supabase
      .from('loads')
      .update({
        macropoint_order_id: result.data.order_id,
        tracking_status: 'active',
        last_location_update: new Date().toISOString(),
      })
      .eq('id', loadId)

    await logger.success(
      {
        macropoint_order_id: result.data.order_id,
        tracking_url: result.data.tracking_url,
      },
      result.data.order_id
    )

    await updateIntegrationSyncStatus(
      integration.id,
      'success',
      `Started tracking for load ${load.reference_number || loadId}`
    )

    return {
      success: true,
      message: `Tracking started for load ${load.reference_number || loadId}`,
      trackingOrderId: result.data.order_id,
      trackingUrl: result.data.tracking_url,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('START_TRACKING_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integration.id, 'error', undefined, errorMsg)

    return {
      success: false,
      message: `Failed to start tracking: ${errorMsg}`,
      errors: [errorMsg],
    }
  }
}

/**
 * Stop tracking for a load
 */
export async function stopLoadTracking(
  loadId: string,
  organizationId: string,
  triggeredBy?: string
): Promise<TrackingResult> {
  const supabase = await createClient()

  // Get integration
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'macropoint')
    .eq('status', 'connected')
    .single()

  if (!integration) {
    return {
      success: false,
      message: 'Macropoint integration not connected',
    }
  }

  const logger = new IntegrationSyncLogger({
    integrationId: integration.id,
    organizationId,
    operation: 'stop_tracking',
    direction: 'push',
    relatedTable: 'loads',
    relatedId: loadId,
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  try {
    await logger.start()

    // Get load's Macropoint order ID
    const { data: load } = await supabase
      .from('loads')
      .select('macropoint_order_id, reference_number')
      .eq('id', loadId)
      .single()

    if (!load?.macropoint_order_id) {
      return {
        success: true,
        message: 'No active tracking for this load',
      }
    }

    const client = await createMacropointClient(organizationId)
    if (!client) {
      throw new Error('Failed to create Macropoint client')
    }

    // Cancel tracking order
    const result = await client.cancelTrackingOrder(load.macropoint_order_id)

    if (!result.success) {
      throw new Error(`Failed to cancel tracking: ${result.error?.message || 'Unknown error'}`)
    }

    // Update load
    await supabase
      .from('loads')
      .update({
        tracking_status: 'inactive',
      })
      .eq('id', loadId)

    await logger.success({ cancelled: true }, load.macropoint_order_id)

    await updateIntegrationSyncStatus(
      integration.id,
      'success',
      `Stopped tracking for load ${load.reference_number || loadId}`
    )

    return {
      success: true,
      message: `Tracking stopped for load ${load.reference_number || loadId}`,
      trackingOrderId: load.macropoint_order_id,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('STOP_TRACKING_FAILED', errorMsg)

    return {
      success: false,
      message: `Failed to stop tracking: ${errorMsg}`,
      errors: [errorMsg],
    }
  }
}

/**
 * Get latest location update for a load
 */
export async function getLoadLocation(
  loadId: string,
  organizationId: string
): Promise<LocationUpdateResult> {
  const supabase = await createClient()

  // Get load's Macropoint order ID
  const { data: load } = await supabase
    .from('loads')
    .select('macropoint_order_id')
    .eq('id', loadId)
    .single()

  if (!load?.macropoint_order_id) {
    return {
      success: false,
      message: 'No active tracking for this load',
    }
  }

  const client = await createMacropointClient(organizationId)
  if (!client) {
    return {
      success: false,
      message: 'Macropoint integration not connected',
    }
  }

  try {
    // Get tracking order details (includes current location and ETA)
    const orderResult = await client.getTrackingOrder(load.macropoint_order_id)

    if (!orderResult.success || !orderResult.data) {
      throw new Error(orderResult.error?.message || 'Failed to get tracking order')
    }

    const order = orderResult.data

    // Update load with latest location
    if (order.current_location) {
      await supabase
        .from('loads')
        .update({
          current_lat: order.current_location.latitude,
          current_lng: order.current_location.longitude,
          current_city: order.current_location.city,
          current_state: order.current_location.state,
          last_location_update: order.current_location.timestamp,
          estimated_arrival: order.eta?.destination_eta,
        })
        .eq('id', loadId)
    }

    return {
      success: true,
      location: order.current_location,
      eta: order.eta,
      status: order.status,
      message: 'Location updated successfully',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to get location: ${errorMsg}`,
    }
  }
}

/**
 * Get location history for a load
 */
export async function getLoadLocationHistory(
  loadId: string,
  organizationId: string,
  options?: {
    start_time?: string
    end_time?: string
    limit?: number
  }
): Promise<{
  success: boolean
  locations?: MacropointLocation[]
  message: string
}> {
  const supabase = await createClient()

  // Get load's Macropoint order ID
  const { data: load } = await supabase
    .from('loads')
    .select('macropoint_order_id')
    .eq('id', loadId)
    .single()

  if (!load?.macropoint_order_id) {
    return {
      success: false,
      message: 'No active tracking for this load',
    }
  }

  const client = await createMacropointClient(organizationId)
  if (!client) {
    return {
      success: false,
      message: 'Macropoint integration not connected',
    }
  }

  try {
    const result = await client.getLocationHistory(load.macropoint_order_id, options)

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to get location history')
    }

    return {
      success: true,
      locations: result.data || [],
      message: `Retrieved ${result.data?.length || 0} location points`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to get location history: ${errorMsg}`,
    }
  }
}

/**
 * Update all active tracking orders
 * Called periodically to sync location data
 */
export async function syncAllActiveTracking(
  organizationId: string,
  triggeredBy?: string
): Promise<{
  success: boolean
  updated: number
  errors: number
  message: string
}> {
  const supabase = await createClient()

  // Get integration
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'macropoint')
    .eq('status', 'connected')
    .single()

  if (!integration) {
    return {
      success: false,
      updated: 0,
      errors: 0,
      message: 'Macropoint integration not connected',
    }
  }

  const logger = new IntegrationSyncLogger({
    integrationId: integration.id,
    organizationId,
    operation: 'sync_all_tracking',
    direction: 'pull',
    relatedTable: 'loads',
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  let updated = 0
  let errors = 0

  try {
    await logger.start()

    const client = await createMacropointClient(organizationId)
    if (!client) {
      throw new Error('Failed to create Macropoint client')
    }

    // Get all loads with active tracking
    const { data: loads } = await supabase
      .from('loads')
      .select('id, macropoint_order_id, reference_number')
      .eq('organization_id', organizationId)
      .not('macropoint_order_id', 'is', null)
      .in('status', ['dispatched', 'in_transit', 'at_pickup', 'at_delivery'])

    if (!loads || loads.length === 0) {
      await logger.success({ updated: 0, message: 'No active tracking orders' })
      return {
        success: true,
        updated: 0,
        errors: 0,
        message: 'No active tracking orders to sync',
      }
    }

    // Update each load's location
    for (const load of loads) {
      try {
        const result = await getLoadLocation(load.id, organizationId)
        if (result.success) {
          updated++

          // Check if load is completed
          if (result.status === 'completed') {
            await supabase
              .from('loads')
              .update({ tracking_status: 'completed' })
              .eq('id', load.id)
          }
        } else {
          errors++
        }
      } catch {
        errors++
      }
    }

    const success = errors === 0
    await logger.success({
      total_loads: loads.length,
      updated,
      errors,
    })

    await updateIntegrationSyncStatus(
      integration.id,
      success ? 'success' : 'partial',
      `Updated ${updated} tracking orders`
    )

    return {
      success,
      updated,
      errors,
      message: `Updated ${updated} of ${loads.length} tracking orders`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('SYNC_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integration.id, 'error', undefined, errorMsg)

    return {
      success: false,
      updated,
      errors: errors + 1,
      message: `Sync failed: ${errorMsg}`,
    }
  }
}

/**
 * Handle Macropoint webhook updates
 */
export async function handleWebhookUpdate(
  payload: {
    order_id: string
    external_reference_id?: string
    event_type: 'location_update' | 'eta_update' | 'status_change' | 'geofence_event'
    location?: MacropointLocation
    eta?: MacropointETA
    status?: TrackingStatus
    geofence?: {
      type: 'arrival' | 'departure'
      location_type: 'pickup' | 'delivery'
    }
  },
  organizationId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  try {
    // Find load by Macropoint order ID or external reference
    const query = supabase.from('loads').select('id, reference_number, status')

    if (payload.order_id) {
      query.eq('macropoint_order_id', payload.order_id)
    } else if (payload.external_reference_id) {
      query.eq('reference_number', payload.external_reference_id)
    } else {
      return { success: false, message: 'No order identifier provided' }
    }

    const { data: load } = await query.eq('organization_id', organizationId).single()

    if (!load) {
      return { success: false, message: 'Load not found for tracking update' }
    }

    const updates: Record<string, unknown> = {}

    // Handle location update
    if (payload.location) {
      updates.current_lat = payload.location.latitude
      updates.current_lng = payload.location.longitude
      updates.current_city = payload.location.city
      updates.current_state = payload.location.state
      updates.last_location_update = payload.location.timestamp
    }

    // Handle ETA update
    if (payload.eta) {
      updates.estimated_arrival = payload.eta.destination_eta
    }

    // Handle status change
    if (payload.status) {
      if (payload.status === 'completed') {
        updates.tracking_status = 'completed'
      } else if (payload.status === 'cancelled' || payload.status === 'expired') {
        updates.tracking_status = 'inactive'
      }
    }

    // Handle geofence events
    if (payload.geofence) {
      if (payload.geofence.type === 'arrival') {
        if (payload.geofence.location_type === 'pickup') {
          updates.status = 'at_pickup'
          updates.actual_pickup = new Date().toISOString()
        } else if (payload.geofence.location_type === 'delivery') {
          updates.status = 'at_delivery'
        }
      } else if (payload.geofence.type === 'departure') {
        if (payload.geofence.location_type === 'pickup') {
          updates.status = 'in_transit'
        } else if (payload.geofence.location_type === 'delivery') {
          updates.status = 'delivered'
          updates.actual_delivery = new Date().toISOString()
          updates.tracking_status = 'completed'
        }
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      await supabase.from('loads').update(updates).eq('id', load.id)

      // Store event in tracking history
      await supabase.from('load_tracking_events').insert({
        load_id: load.id,
        event_type: payload.event_type,
        location: payload.location,
        eta: payload.eta,
        status: payload.status,
        geofence: payload.geofence,
        raw_payload: payload,
        created_at: new Date().toISOString(),
      })
    }

    return { success: true, message: 'Tracking update processed' }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: `Failed to process webhook: ${errorMsg}` }
  }
}

/**
 * Request a check-in from the driver
 */
export async function requestDriverCheckIn(
  loadId: string,
  organizationId: string,
  triggeredBy?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  // Get load's Macropoint order ID
  const { data: load } = await supabase
    .from('loads')
    .select('macropoint_order_id, reference_number')
    .eq('id', loadId)
    .single()

  if (!load?.macropoint_order_id) {
    return {
      success: false,
      message: 'No active tracking for this load',
    }
  }

  const client = await createMacropointClient(organizationId)
  if (!client) {
    return {
      success: false,
      message: 'Macropoint integration not connected',
    }
  }

  try {
    const result = await client.requestCheckIn(load.macropoint_order_id)

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to request check-in')
    }

    return {
      success: true,
      message: `Check-in request sent to driver for load ${load.reference_number || loadId}`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to request check-in: ${errorMsg}`,
    }
  }
}
