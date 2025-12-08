import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleWebhookUpdate } from '@/lib/integrations/macropoint'

/**
 * Macropoint Webhook Handler
 * Receives real-time tracking updates from Macropoint
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if provided
    const signature = request.headers.get('x-macropoint-signature')
    const webhookSecret = process.env.MACROPOINT_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      // Macropoint uses HMAC-SHA256 for webhook signatures
      const crypto = await import('crypto')
      const body = await request.text()
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')

      if (signature !== expectedSignature) {
        console.error('[Macropoint Webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }

      // Parse body after verification
      const payload = JSON.parse(body)
      return await processWebhook(payload)
    }

    // If no signature verification, parse JSON directly
    const payload = await request.json()
    return await processWebhook(payload)
  } catch (error) {
    console.error('[Macropoint Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processWebhook(payload: {
  order_id?: string
  external_reference_id?: string
  organization_id?: string
  event_type: string
  data?: Record<string, unknown>
}) {
  const supabase = await createClient()

  // Find the organization by Macropoint order or external reference
  let organizationId = payload.organization_id

  if (!organizationId && payload.order_id) {
    const { data: load } = await supabase
      .from('loads')
      .select('organization_id')
      .eq('macropoint_order_id', payload.order_id)
      .single()

    organizationId = load?.organization_id
  }

  if (!organizationId && payload.external_reference_id) {
    const { data: load } = await supabase
      .from('loads')
      .select('organization_id')
      .eq('reference_number', payload.external_reference_id)
      .single()

    organizationId = load?.organization_id
  }

  if (!organizationId) {
    console.warn('[Macropoint Webhook] Could not determine organization')
    return NextResponse.json({ received: true, processed: false })
  }

  // Map webhook event types
  const eventTypeMap: Record<string, string> = {
    'tracking.location.update': 'location_update',
    'tracking.eta.update': 'eta_update',
    'tracking.status.change': 'status_change',
    'tracking.geofence.arrival': 'geofence_event',
    'tracking.geofence.departure': 'geofence_event',
  }

  const eventType = eventTypeMap[payload.event_type] || payload.event_type

  // Extract location data
  const location = payload.data?.location
    ? {
        latitude: (payload.data.location as Record<string, unknown>).lat as number,
        longitude: (payload.data.location as Record<string, unknown>).lng as number,
        timestamp: (payload.data.location as Record<string, unknown>).timestamp as string,
        city: (payload.data.location as Record<string, unknown>).city as string | undefined,
        state: (payload.data.location as Record<string, unknown>).state as string | undefined,
        speed_mph: (payload.data.location as Record<string, unknown>).speed_mph as number | undefined,
      }
    : undefined

  // Extract ETA data
  const eta = payload.data?.eta
    ? {
        destination_eta: (payload.data.eta as Record<string, unknown>).destination as string,
        pickup_eta: (payload.data.eta as Record<string, unknown>).pickup as string | undefined,
        confidence: ((payload.data.eta as Record<string, unknown>).confidence as string || 'medium') as 'high' | 'medium' | 'low',
        distance_miles: (payload.data.eta as Record<string, unknown>).distance_miles as number | undefined,
      }
    : undefined

  // Extract geofence data
  const geofence = payload.event_type.includes('geofence')
    ? {
        type: payload.event_type.includes('arrival') ? 'arrival' as const : 'departure' as const,
        location_type: (payload.data?.stop_type as string || 'delivery') as 'pickup' | 'delivery',
      }
    : undefined

  const result = await handleWebhookUpdate(
    {
      order_id: payload.order_id || '',
      external_reference_id: payload.external_reference_id,
      event_type: eventType as 'location_update' | 'eta_update' | 'status_change' | 'geofence_event',
      location,
      eta,
      status: payload.data?.status as 'pending' | 'active' | 'completed' | 'cancelled' | 'expired' | 'no_response' | undefined,
      geofence,
    },
    organizationId
  )

  return NextResponse.json({
    received: true,
    processed: result.success,
    message: result.message,
  })
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'macropoint-webhook' })
}
