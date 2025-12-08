import { createClient } from '@/lib/supabase/server'
import { createDATClient, type DATRateResponse } from './client'
import { IntegrationSyncLogger, updateIntegrationSyncStatus } from '../core/logger'

interface RateLookupResult {
  success: boolean
  rate_data?: {
    rate_per_mile: number
    total_rate: number
    mileage: number
    market_low: number
    market_high: number
    market_average: number
    fuel_surcharge?: number
    confidence: 'high' | 'medium' | 'low'
  }
  cached: boolean
  cache_age_hours?: number
  message: string
}

const CACHE_HOURS = 4 // Cache rates for 4 hours

/**
 * Get market rate for a lane, using cache if available
 */
export async function getRateForLane(
  organizationId: string,
  origin: { city: string; state: string; zip?: string },
  destination: { city: string; state: string; zip?: string },
  equipmentType: string,
  pickupDate?: string,
  forceRefresh = false
): Promise<RateLookupResult> {
  const supabase = await createClient()

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cacheResult = await checkRateCache(
      supabase,
      organizationId,
      origin,
      destination,
      equipmentType
    )

    if (cacheResult) {
      return {
        success: true,
        rate_data: {
          rate_per_mile: Number(cacheResult.rate_per_mile),
          total_rate: Number(cacheResult.total_rate),
          mileage: Number(cacheResult.mileage),
          market_low: Number(cacheResult.market_low),
          market_high: Number(cacheResult.market_high),
          market_average: Number(cacheResult.market_avg),
          fuel_surcharge: cacheResult.fuel_surcharge
            ? Number(cacheResult.fuel_surcharge)
            : undefined,
          confidence: 'medium', // Cached data is medium confidence
        },
        cached: true,
        cache_age_hours: Math.round(
          (Date.now() - new Date(cacheResult.created_at as string).getTime()) / (1000 * 60 * 60)
        ),
        message: 'Rate from cache',
      }
    }
  }

  // Get integration
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'dat')
    .single()

  if (!integration) {
    return {
      success: false,
      cached: false,
      message: 'DAT integration not connected',
    }
  }

  // Create client and fetch rate
  const client = await createDATClient(organizationId)
  if (!client) {
    return {
      success: false,
      cached: false,
      message: 'Failed to create DAT client',
    }
  }

  const logger = new IntegrationSyncLogger({
    integrationId: integration.id,
    organizationId,
    operation: 'rate_lookup',
    direction: 'pull',
    relatedTable: 'rate_lookups',
    triggerType: 'manual',
  })

  try {
    await logger.start()

    const result = await client.getRate({
      origin,
      destination,
      equipment_type: equipmentType,
      pickup_date: pickupDate,
    })

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Rate lookup failed')
    }

    const rateData = result.data

    // Cache the rate
    await supabase.from('rate_lookups').insert({
      organization_id: organizationId,
      provider: 'dat',
      origin_city: origin.city,
      origin_state: origin.state,
      origin_zip: origin.zip,
      dest_city: destination.city,
      dest_state: destination.state,
      dest_zip: destination.zip,
      equipment_type: equipmentType,
      rate_per_mile: rateData.rate_per_mile,
      total_rate: rateData.total_rate,
      mileage: rateData.mileage,
      market_low: rateData.market_low,
      market_high: rateData.market_high,
      market_avg: rateData.market_average,
      fuel_surcharge: rateData.fuel_surcharge,
      rate_date: rateData.rate_date,
      valid_until: new Date(Date.now() + CACHE_HOURS * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      raw_response: rateData,
    })

    await logger.success({
      rate_per_mile: rateData.rate_per_mile,
      mileage: rateData.mileage,
      confidence: rateData.confidence,
    })

    await updateIntegrationSyncStatus(
      integration.id,
      'success',
      `Rate lookup: $${rateData.rate_per_mile.toFixed(2)}/mile for ${origin.city}, ${origin.state} → ${destination.city}, ${destination.state}`
    )

    return {
      success: true,
      rate_data: {
        rate_per_mile: rateData.rate_per_mile,
        total_rate: rateData.total_rate,
        mileage: rateData.mileage,
        market_low: rateData.market_low,
        market_high: rateData.market_high,
        market_average: rateData.market_average,
        fuel_surcharge: rateData.fuel_surcharge,
        confidence: rateData.confidence,
      },
      cached: false,
      message: 'Fresh rate from DAT',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('RATE_LOOKUP_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integration.id, 'error', undefined, errorMsg)

    return {
      success: false,
      cached: false,
      message: `Rate lookup failed: ${errorMsg}`,
    }
  }
}

/**
 * Check if we have a cached rate
 */
async function checkRateCache(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  origin: { city: string; state: string },
  destination: { city: string; state: string },
  equipmentType: string
): Promise<Record<string, unknown> | null> {
  const cacheThreshold = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('rate_lookups')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('provider', 'dat')
    .eq('origin_state', origin.state)
    .eq('dest_state', destination.state)
    .eq('equipment_type', equipmentType)
    .gte('created_at', cacheThreshold)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data
}

/**
 * Get rate history for analytics
 */
export async function getRateHistory(
  organizationId: string,
  originState: string,
  destState: string,
  equipmentType: string,
  days = 30
): Promise<{
  success: boolean
  history?: Array<{ date: string; rate: number; volume: number }>
  message: string
}> {
  const client = await createDATClient(organizationId)
  if (!client) {
    return { success: false, message: 'DAT not connected' }
  }

  const result = await client.getRateHistory(originState, destState, equipmentType, days)

  if (!result.success || !result.data) {
    return { success: false, message: result.error?.message || 'Failed to get rate history' }
  }

  return {
    success: true,
    history: result.data.rates,
    message: `Retrieved ${result.data.rates.length} days of rate history`,
  }
}

/**
 * Calculate suggested rates based on market data and margins
 */
export function calculateSuggestedRates(
  marketRate: number,
  marketLow: number,
  marketHigh: number,
  targetMarginPercent = 15
): {
  suggested_customer_rate: number
  suggested_carrier_rate: number
  estimated_margin_percent: number
  estimated_margin_dollars: number
} {
  // Customer rate: Market rate + margin
  const marginMultiplier = 1 + targetMarginPercent / 100
  const suggested_customer_rate = Math.round(marketRate * marginMultiplier * 100) / 100

  // Carrier rate: Try to get slightly below market average
  const suggested_carrier_rate = Math.round((marketRate * 0.95) * 100) / 100

  // Calculate actual margin
  const estimated_margin_dollars = suggested_customer_rate - suggested_carrier_rate
  const estimated_margin_percent =
    Math.round((estimated_margin_dollars / suggested_customer_rate) * 10000) / 100

  return {
    suggested_customer_rate,
    suggested_carrier_rate,
    estimated_margin_percent,
    estimated_margin_dollars,
  }
}
