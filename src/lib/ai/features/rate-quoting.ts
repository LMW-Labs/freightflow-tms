import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { structuredCompletion } from '../core/client'
import { buildRateQuotePrompt } from '../core/prompts'
import { RateQuoteRequest, RateQuoteResponse } from '../core/types'
import { getRateForLane } from '@/lib/integrations/dat'

interface RateQuoteResult {
  success: boolean
  quote?: RateQuoteResponse
  suggestionId?: string
  error?: string
}

// Get historical lane data
async function getHistoricalLaneData(
  organizationId: string,
  originState: string,
  destState: string,
  equipmentType: string
): Promise<{ loads: number; avgRate: number; avgMargin: number } | null> {
  const supabase = await createSupabaseClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: loads } = await supabase
    .from('loads')
    .select('customer_rate, carrier_rate')
    .eq('organization_id', organizationId)
    .eq('origin_state', originState)
    .eq('dest_state', destState)
    .eq('equipment_type', equipmentType)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .not('customer_rate', 'is', null)
    .not('carrier_rate', 'is', null)

  if (!loads || loads.length < 3) {
    return null // Not enough data
  }

  const totalCustomerRate = loads.reduce((sum, l) => sum + (l.customer_rate || 0), 0)
  const totalCarrierRate = loads.reduce((sum, l) => sum + (l.carrier_rate || 0), 0)
  const avgCustomerRate = totalCustomerRate / loads.length
  const avgCarrierRate = totalCarrierRate / loads.length
  const avgMargin = avgCarrierRate > 0 ? ((avgCustomerRate - avgCarrierRate) / avgCustomerRate) * 100 : 0

  return {
    loads: loads.length,
    avgRate: avgCustomerRate,
    avgMargin,
  }
}

// Main rate quoting function
export async function getAIRateQuote(
  request: RateQuoteRequest,
  organizationId: string,
  userId?: string,
  loadId?: string
): Promise<RateQuoteResult> {
  const supabase = await createSupabaseClient()

  try {
    // 1. Get historical data
    const historicalData = await getHistoricalLaneData(
      organizationId,
      request.origin_state,
      request.dest_state,
      request.equipment_type
    )

    // 2. Get market data from DAT (if integrated)
    let promptMarketData: { datRate?: number; truckstopRate?: number } | undefined
    let responseMarketData: { dat_rate?: number; truckstop_rate?: number; market_trend?: 'up' | 'down' | 'stable' } | undefined

    try {
      // Check if DAT is configured
      const { data: settings } = await supabase
        .from('integration_settings')
        .select('credentials')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'dat')
        .eq('is_enabled', true)
        .single()

      if (settings) {
        const datResult = await getRateForLane(
          organizationId,
          { city: request.origin_city, state: request.origin_state },
          { city: request.dest_city, state: request.dest_state },
          request.equipment_type
        )

        if (datResult.success && datResult.rate_data) {
          promptMarketData = {
            datRate: datResult.rate_data.market_average,
          }
          responseMarketData = {
            dat_rate: datResult.rate_data.market_average,
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get DAT rate:', error)
      // Continue without market data
    }

    // 3. Build prompt with context
    const prompt = buildRateQuotePrompt(
      historicalData || undefined,
      promptMarketData
    )

    // 4. Build user message
    const userMessage = `Provide a rate quote for this load:

Origin: ${request.origin_city}, ${request.origin_state}
Destination: ${request.dest_city}, ${request.dest_state}
Equipment: ${request.equipment_type}
${request.weight ? `Weight: ${request.weight} lbs` : ''}
${request.pickup_date ? `Pickup Date: ${request.pickup_date}` : ''}
${request.special_requirements?.length ? `Special Requirements: ${request.special_requirements.join(', ')}` : ''}

Respond with a JSON object containing suggested_customer_rate, suggested_carrier_rate, predicted_margin_pct, confidence, and reasoning.`

    // 5. Get AI quote
    const response = await structuredCompletion<RateQuoteResponse>({
      feature: 'rate_quote',
      organizationId,
      userId,
      systemPrompt: prompt,
      userMessage,
    })

    if (!response.success || !response.data) {
      return { success: false, error: response.error }
    }

    const quote = response.data

    // Add market data to response
    if (responseMarketData || historicalData) {
      quote.market_data = responseMarketData
      quote.historical_data = historicalData ? {
        similar_loads_count: historicalData.loads,
        avg_rate: historicalData.avgRate,
        avg_margin: historicalData.avgMargin,
      } : undefined
    }

    // 6. Save suggestion to database
    const { data: suggestion } = await supabase
      .from('ai_rate_suggestions')
      .insert({
        organization_id: organizationId,
        load_id: loadId,
        user_id: userId,
        origin_city: request.origin_city,
        origin_state: request.origin_state,
        dest_city: request.dest_city,
        dest_state: request.dest_state,
        equipment_type: request.equipment_type,
        weight: request.weight,
        pickup_date: request.pickup_date,
        suggested_customer_rate: quote.suggested_customer_rate,
        suggested_carrier_rate: quote.suggested_carrier_rate,
        predicted_margin_pct: quote.predicted_margin_pct,
        confidence: quote.confidence,
        reasoning: quote.reasoning,
        market_data: quote.market_data,
        historical_data: quote.historical_data,
      })
      .select('id')
      .single()

    return {
      success: true,
      quote,
      suggestionId: suggestion?.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// Record actual outcome for learning
export async function recordRateOutcome(
  suggestionId: string,
  actualCustomerRate: number,
  actualCarrierRate: number,
  suggestionUsed: boolean,
  feedback?: string
): Promise<void> {
  const supabase = await createSupabaseClient()

  const actualMargin = actualCarrierRate > 0
    ? ((actualCustomerRate - actualCarrierRate) / actualCustomerRate) * 100
    : 0

  await supabase
    .from('ai_rate_suggestions')
    .update({
      actual_customer_rate: actualCustomerRate,
      actual_carrier_rate: actualCarrierRate,
      actual_margin_pct: actualMargin,
      suggestion_used: suggestionUsed,
      feedback,
    })
    .eq('id', suggestionId)
}

// Get rate suggestion accuracy stats
export async function getRateSuggestionStats(
  organizationId: string,
  days: number = 30
): Promise<{
  totalSuggestions: number
  suggestionsUsed: number
  avgAccuracy: number
  avgMarginDiff: number
}> {
  const supabase = await createSupabaseClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data: suggestions } = await supabase
    .from('ai_rate_suggestions')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', cutoff.toISOString())
    .not('actual_customer_rate', 'is', null)

  if (!suggestions || suggestions.length === 0) {
    return {
      totalSuggestions: 0,
      suggestionsUsed: 0,
      avgAccuracy: 0,
      avgMarginDiff: 0,
    }
  }

  const totalSuggestions = suggestions.length
  const suggestionsUsed = suggestions.filter(s => s.suggestion_used).length

  // Calculate accuracy (how close was the suggestion to actual)
  const accuracies = suggestions.map(s => {
    const suggestedRate = s.suggested_customer_rate
    const actualRate = s.actual_customer_rate
    const diff = Math.abs(suggestedRate - actualRate)
    const accuracy = Math.max(0, 100 - (diff / actualRate) * 100)
    return accuracy
  })
  const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length

  // Calculate margin difference
  const marginDiffs = suggestions.map(s => {
    return Math.abs(s.predicted_margin_pct - s.actual_margin_pct)
  })
  const avgMarginDiff = marginDiffs.reduce((a, b) => a + b, 0) / marginDiffs.length

  return {
    totalSuggestions,
    suggestionsUsed,
    avgAccuracy,
    avgMarginDiff,
  }
}
