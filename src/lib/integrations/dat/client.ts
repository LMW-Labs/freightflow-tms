import { ApiKeyIntegrationClient } from '../core/base-client'
import type { ApiResponse } from '../core/types'

const DAT_BASE_URL = 'https://freight.api.dat.com/v3'

interface DATRateRequest {
  origin: {
    city: string
    state: string
    zip?: string
  }
  destination: {
    city: string
    state: string
    zip?: string
  }
  equipment_type: string
  pickup_date?: string
}

interface DATRateResponse {
  rate_per_mile: number
  total_rate: number
  mileage: number
  fuel_surcharge?: number
  market_low: number
  market_high: number
  market_average: number
  rate_date: string
  confidence: 'high' | 'medium' | 'low'
  sample_size: number
}

interface DATLoadPostRequest {
  reference_number: string
  origin: {
    city: string
    state: string
    zip?: string
    pickup_date: string
    pickup_time_start?: string
    pickup_time_end?: string
  }
  destination: {
    city: string
    state: string
    zip?: string
    delivery_date: string
    delivery_time_start?: string
    delivery_time_end?: string
  }
  equipment_type: string
  rate: number
  rate_type: 'flat' | 'per_mile'
  weight?: number
  length?: number
  commodity?: string
  comments?: string
  contact_name: string
  contact_phone: string
  contact_email?: string
}

interface DATLoadPostResponse {
  load_id: string
  posting_id: string
  status: 'active' | 'pending' | 'expired' | 'removed'
  posted_at: string
  expires_at: string
}

interface DATLoadSearchResult {
  load_id: string
  origin: { city: string; state: string }
  destination: { city: string; state: string }
  equipment_type: string
  rate?: number
  pickup_date: string
  delivery_date?: string
  mileage: number
  company_name: string
  posted_at: string
}

/**
 * DAT Load Board API Client
 * Provides market rate lookups and load posting capabilities
 */
export class DATClient extends ApiKeyIntegrationClient {
  constructor(organizationId: string) {
    super(
      {
        provider: 'dat',
        baseUrl: DAT_BASE_URL,
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      organizationId
    )
  }

  protected getApiKeyHeader(): string {
    return 'Authorization'
  }

  /**
   * Override to include Bearer prefix for DAT
   */
  protected async getAuthorizationHeader(): Promise<string | null> {
    const apiKey = await this.getApiKey()
    if (!apiKey) return null
    return `Bearer ${apiKey}`
  }

  // ===== RATE LOOKUPS =====

  /**
   * Get current market rate for a lane
   */
  async getRate(request: DATRateRequest): Promise<ApiResponse<DATRateResponse>> {
    return this.request<DATRateResponse>('/rates/lane', {
      method: 'POST',
      body: {
        origin: request.origin,
        destination: request.destination,
        equipment_type: this.mapEquipmentType(request.equipment_type),
        date: request.pickup_date || new Date().toISOString().split('T')[0],
      },
    })
  }

  /**
   * Get rate history for a lane (past 30 days)
   */
  async getRateHistory(
    originState: string,
    destState: string,
    equipmentType: string,
    days = 30
  ): Promise<ApiResponse<{ rates: Array<{ date: string; rate: number; volume: number }> }>> {
    return this.request('/rates/history', {
      method: 'POST',
      body: {
        origin_state: originState,
        destination_state: destState,
        equipment_type: this.mapEquipmentType(equipmentType),
        days,
      },
    })
  }

  /**
   * Get rate forecast for a lane
   */
  async getRateForecast(
    originState: string,
    destState: string,
    equipmentType: string,
    days = 14
  ): Promise<ApiResponse<{ forecasts: Array<{ date: string; predicted_rate: number; confidence: number }> }>> {
    return this.request('/rates/forecast', {
      method: 'POST',
      body: {
        origin_state: originState,
        destination_state: destState,
        equipment_type: this.mapEquipmentType(equipmentType),
        forecast_days: days,
      },
    })
  }

  // ===== LOAD POSTING =====

  /**
   * Post a load to DAT
   */
  async postLoad(load: DATLoadPostRequest): Promise<ApiResponse<DATLoadPostResponse>> {
    return this.request<DATLoadPostResponse>('/loads', {
      method: 'POST',
      body: {
        reference_number: load.reference_number,
        origin: load.origin,
        destination: load.destination,
        equipment_type: this.mapEquipmentType(load.equipment_type),
        rate: {
          amount: load.rate,
          type: load.rate_type,
        },
        freight: {
          weight: load.weight,
          length: load.length,
          commodity: load.commodity,
        },
        comments: load.comments,
        contact: {
          name: load.contact_name,
          phone: load.contact_phone,
          email: load.contact_email,
        },
      },
    })
  }

  /**
   * Update an existing load posting
   */
  async updateLoad(
    postingId: string,
    updates: Partial<DATLoadPostRequest>
  ): Promise<ApiResponse<DATLoadPostResponse>> {
    return this.request<DATLoadPostResponse>(`/loads/${postingId}`, {
      method: 'PATCH',
      body: updates,
    })
  }

  /**
   * Remove a load posting
   */
  async removeLoad(postingId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/loads/${postingId}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get status of a load posting
   */
  async getLoadStatus(postingId: string): Promise<ApiResponse<DATLoadPostResponse>> {
    return this.request<DATLoadPostResponse>(`/loads/${postingId}`)
  }

  // ===== LOAD SEARCH =====

  /**
   * Search for available loads (for carriers)
   */
  async searchLoads(params: {
    origin_state?: string
    dest_state?: string
    equipment_type?: string
    radius_miles?: number
    limit?: number
  }): Promise<ApiResponse<{ loads: DATLoadSearchResult[]; total: number }>> {
    const queryParams = new URLSearchParams()
    if (params.origin_state) queryParams.set('origin_state', params.origin_state)
    if (params.dest_state) queryParams.set('dest_state', params.dest_state)
    if (params.equipment_type)
      queryParams.set('equipment_type', this.mapEquipmentType(params.equipment_type))
    if (params.radius_miles) queryParams.set('radius', params.radius_miles.toString())
    if (params.limit) queryParams.set('limit', params.limit.toString())

    return this.request(`/loads/search?${queryParams.toString()}`)
  }

  // ===== HELPERS =====

  /**
   * Map our equipment types to DAT equipment codes
   */
  private mapEquipmentType(type: string): string {
    const mapping: Record<string, string> = {
      dry_van: 'V',
      reefer: 'R',
      flatbed: 'F',
      step_deck: 'SD',
      lowboy: 'LB',
      power_only: 'PO',
      container: 'C',
      tanker: 'T',
      hopper: 'HB',
      livestock: 'LV',
    }
    return mapping[type.toLowerCase()] || type
  }

  /**
   * Calculate mileage between two points using DAT
   */
  async getMileage(
    origin: { city: string; state: string; zip?: string },
    destination: { city: string; state: string; zip?: string }
  ): Promise<ApiResponse<{ miles: number; hours: number }>> {
    return this.request('/mileage', {
      method: 'POST',
      body: { origin, destination },
    })
  }
}

/**
 * Create a DAT client for an organization
 */
export async function createDATClient(organizationId: string): Promise<DATClient | null> {
  const client = new DATClient(organizationId)
  const isConnected = await client.isConnected()

  if (!isConnected) {
    return null
  }

  return client
}

// Export types
export type {
  DATRateRequest,
  DATRateResponse,
  DATLoadPostRequest,
  DATLoadPostResponse,
  DATLoadSearchResult,
}
