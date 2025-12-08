import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { structuredCompletion } from '../core/client'
import { buildCarrierMatchPrompt } from '../core/prompts'
import { CarrierMatchRequest, CarrierMatchResult } from '../core/types'

interface CarrierMatchingResult {
  success: boolean
  matches?: CarrierMatchResult[]
  error?: string
}

interface CarrierWithStats {
  id: string
  company_name: string
  mc_number: string
  equipment_types: string[]
  preferred_lanes: string[]
  ontime_delivery_pct: number | null
  loads_completed: number
  avg_rate: number | null
  last_load_date: string | null
  current_location_city: string | null
  current_location_state: string | null
}

// Get carriers with their performance stats
async function getCarriersWithStats(
  organizationId: string,
  equipmentType: string,
  limit: number = 20
): Promise<CarrierWithStats[]> {
  const supabase = await createSupabaseClient()

  // Get all active carriers
  const { data: carriers } = await supabase
    .from('carriers')
    .select('id, company_name, mc_number, equipment_types, preferred_lanes, status')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .limit(50)

  if (!carriers || carriers.length === 0) {
    return []
  }

  // Filter by equipment type
  const matchingCarriers = carriers.filter(c =>
    c.equipment_types?.includes(equipmentType) ||
    c.equipment_types?.includes('all') ||
    !c.equipment_types?.length
  )

  // Get performance stats for each carrier
  const carriersWithStats: CarrierWithStats[] = []

  for (const carrier of matchingCarriers.slice(0, limit)) {
    // Get load stats
    const { data: loads } = await supabase
      .from('loads')
      .select('id, carrier_rate, status, actual_delivery_date, delivery_date, updated_at')
      .eq('carrier_id', carrier.id)
      .in('status', ['delivered', 'invoiced', 'paid'])
      .order('updated_at', { ascending: false })
      .limit(50)

    const loadsCompleted = loads?.length || 0

    // Calculate on-time percentage
    let ontimeDeliveryPct: number | null = null
    if (loads && loads.length >= 5) {
      const onTimeLoads = loads.filter(l => {
        if (!l.actual_delivery_date || !l.delivery_date) return true
        return new Date(l.actual_delivery_date) <= new Date(l.delivery_date)
      })
      ontimeDeliveryPct = (onTimeLoads.length / loads.length) * 100
    }

    // Calculate average rate
    let avgRate: number | null = null
    if (loads && loads.length > 0) {
      const ratesSum = loads.reduce((sum, l) => sum + (l.carrier_rate || 0), 0)
      avgRate = ratesSum / loads.length
    }

    // Get last load date
    const lastLoadDate = loads?.[0]?.updated_at || null

    carriersWithStats.push({
      id: carrier.id,
      company_name: carrier.company_name,
      mc_number: carrier.mc_number || '',
      equipment_types: carrier.equipment_types || [],
      preferred_lanes: carrier.preferred_lanes || [],
      ontime_delivery_pct: ontimeDeliveryPct,
      loads_completed: loadsCompleted,
      avg_rate: avgRate,
      last_load_date: lastLoadDate,
      current_location_city: null, // Would come from tracking
      current_location_state: null,
    })
  }

  return carriersWithStats
}

// Score carrier based on lane experience
function scoreLaneExperience(
  carrier: CarrierWithStats,
  originState: string,
  destState: string
): number {
  const preferredLanes = carrier.preferred_lanes || []

  // Check for exact lane match
  const exactMatch = preferredLanes.some(lane => {
    const parts = lane.split('-').map(s => s.trim().toUpperCase())
    return parts.includes(originState.toUpperCase()) && parts.includes(destState.toUpperCase())
  })

  if (exactMatch) return 100

  // Check for origin or destination match
  const partialMatch = preferredLanes.some(lane => {
    const parts = lane.split('-').map(s => s.trim().toUpperCase())
    return parts.includes(originState.toUpperCase()) || parts.includes(destState.toUpperCase())
  })

  if (partialMatch) return 60

  // Has completed loads (some experience)
  if (carrier.loads_completed > 10) return 40
  if (carrier.loads_completed > 0) return 20

  return 0
}

// Main carrier matching function
export async function matchCarriersToLoad(
  request: CarrierMatchRequest,
  organizationId: string,
  userId?: string,
  topN: number = 5
): Promise<CarrierMatchingResult> {
  try {
    // 1. Get carriers with stats
    const carriers = await getCarriersWithStats(
      organizationId,
      request.equipment_type,
      30
    )

    if (carriers.length === 0) {
      return {
        success: true,
        matches: [],
      }
    }

    // 2. Calculate initial scores
    const scoredCarriers = carriers.map(carrier => {
      const laneScore = scoreLaneExperience(
        carrier,
        request.origin_state,
        request.dest_state
      )

      const performanceScore = carrier.ontime_delivery_pct || 80 // Default to 80 if no data
      const equipmentMatch = carrier.equipment_types.includes(request.equipment_type) ||
        carrier.equipment_types.includes('all') ||
        carrier.equipment_types.length === 0

      // Simple weighted score
      const initialScore =
        laneScore * 0.3 +
        performanceScore * 0.3 +
        (equipmentMatch ? 100 : 0) * 0.2 +
        Math.min(carrier.loads_completed, 100) * 0.2

      return {
        ...carrier,
        laneScore,
        performanceScore,
        equipmentMatch,
        initialScore,
      }
    })

    // Sort by initial score and take top candidates
    const topCandidates = scoredCarriers
      .sort((a, b) => b.initialScore - a.initialScore)
      .slice(0, Math.min(10, carriers.length))

    // 3. Use AI to refine rankings and provide reasoning
    const prompt = buildCarrierMatchPrompt(
      topCandidates.map(c => ({
        id: c.id,
        name: c.company_name,
        mc_number: c.mc_number,
        equipment_types: c.equipment_types,
        preferred_lanes: c.preferred_lanes,
        ontime_delivery_pct: c.ontime_delivery_pct || undefined,
        loads_completed: c.loads_completed,
        avg_rate: c.avg_rate || undefined,
      }))
    )

    const userMessage = `Find the best carriers for this load:

Load Details:
- Origin: ${request.origin_city}, ${request.origin_state}
- Destination: ${request.dest_city}, ${request.dest_state}
- Equipment: ${request.equipment_type}
- Pickup Date: ${request.pickup_date}
${request.weight ? `- Weight: ${request.weight} lbs` : ''}
${request.special_requirements?.length ? `- Special Requirements: ${request.special_requirements.join(', ')}` : ''}

Rank the top ${topN} carriers and explain why each is a good match. Return as a JSON array of carrier match objects.`

    const response = await structuredCompletion<CarrierMatchResult[]>({
      feature: 'carrier_matching',
      organizationId,
      userId,
      systemPrompt: prompt,
      userMessage,
    })

    if (!response.success || !response.data) {
      // Fall back to algorithmic ranking
      const fallbackMatches: CarrierMatchResult[] = topCandidates
        .slice(0, topN)
        .map(c => ({
          carrier_id: c.id,
          carrier_name: c.company_name,
          mc_number: c.mc_number,
          match_score: Math.round(c.initialScore),
          reasoning: `Matched based on ${c.equipmentMatch ? 'equipment compatibility' : 'availability'} and ${c.loads_completed} completed loads.`,
          factors: {
            lane_experience: c.laneScore,
            equipment_match: c.equipmentMatch,
            availability_score: 70, // Default
            performance_score: c.performanceScore,
            rate_competitiveness: 70, // Default
          },
          suggested_rate: c.avg_rate || undefined,
        }))

      return {
        success: true,
        matches: fallbackMatches,
      }
    }

    // Ensure carrier IDs are correct (AI might hallucinate)
    const validMatches = (response.data as CarrierMatchResult[])
      .filter(match => topCandidates.some(c => c.id === match.carrier_id))
      .slice(0, topN)

    return {
      success: true,
      matches: validMatches,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// Get carrier availability estimate based on recent activity
export async function getCarrierAvailability(
  carrierId: string,
  targetDate: string
): Promise<{ available: boolean; confidence: number; reason: string }> {
  const supabase = await createSupabaseClient()

  // Check for loads around target date
  const { data: loads } = await supabase
    .from('loads')
    .select('id, pickup_date, delivery_date, status')
    .eq('carrier_id', carrierId)
    .in('status', ['booked', 'dispatched', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery'])
    .gte('delivery_date', targetDate)
    .lte('pickup_date', targetDate)

  if (loads && loads.length > 0) {
    return {
      available: false,
      confidence: 0.9,
      reason: `Carrier has ${loads.length} active load(s) around this date`,
    }
  }

  // Check recent activity
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { count } = await supabase
    .from('loads')
    .select('*', { count: 'exact', head: true })
    .eq('carrier_id', carrierId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  if (count === 0) {
    return {
      available: true,
      confidence: 0.5,
      reason: 'No recent loads - may be inactive or available',
    }
  }

  return {
    available: true,
    confidence: 0.7,
    reason: 'No conflicting loads found',
  }
}
