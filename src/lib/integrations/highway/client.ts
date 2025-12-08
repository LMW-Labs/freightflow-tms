import { ApiKeyIntegrationClient } from '../core/base-client'
import type { ApiResponse } from '../core/types'

const HIGHWAY_BASE_URL = 'https://api.highway.com/v1'

interface HighwayCarrierInfo {
  dot_number: string
  mc_number?: string
  legal_name: string
  dba_name?: string
  physical_address: {
    street: string
    city: string
    state: string
    zip: string
  }
  mailing_address?: {
    street: string
    city: string
    state: string
    zip: string
  }
  phone?: string
  email?: string
}

interface HighwayAuthorityStatus {
  authority_type: 'common' | 'contract' | 'broker'
  status: 'active' | 'inactive' | 'revoked' | 'pending'
  status_date: string
  authority_granted_date?: string
}

interface HighwayInsurance {
  type: 'cargo' | 'liability' | 'auto'
  policy_number?: string
  coverage_amount: number
  effective_date: string
  expiration_date: string
  insurer_name: string
  status: 'valid' | 'expired' | 'cancelled' | 'pending'
}

interface HighwaySafetyRating {
  rating: 'satisfactory' | 'conditional' | 'unsatisfactory' | 'none'
  rating_date?: string
  out_of_service_percentage: number
  crash_indicator?: number
  driver_fitness?: number
  vehicle_maintenance?: number
}

interface HighwayCarrierResponse {
  carrier: HighwayCarrierInfo
  authority: HighwayAuthorityStatus[]
  insurance: HighwayInsurance[]
  safety: HighwaySafetyRating
  flags: string[]
  last_updated: string
}

/**
 * Highway API Client for carrier vetting
 * Verifies MC/DOT authority, insurance, and safety scores
 */
export class HighwayClient extends ApiKeyIntegrationClient {
  constructor(organizationId: string) {
    super(
      {
        provider: 'highway',
        baseUrl: HIGHWAY_BASE_URL,
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      organizationId
    )
  }

  protected getApiKeyHeader(): string {
    return 'X-API-Key'
  }

  /**
   * Verify a carrier by DOT number
   */
  async verifyByDOT(dotNumber: string): Promise<ApiResponse<HighwayCarrierResponse>> {
    return this.request<HighwayCarrierResponse>(`/carriers/dot/${dotNumber}`)
  }

  /**
   * Verify a carrier by MC number
   */
  async verifyByMC(mcNumber: string): Promise<ApiResponse<HighwayCarrierResponse>> {
    // Clean MC number - remove "MC" prefix if present
    const cleanMC = mcNumber.replace(/^MC[-\s]?/i, '')
    return this.request<HighwayCarrierResponse>(`/carriers/mc/${cleanMC}`)
  }

  /**
   * Search for carriers by name
   */
  async searchByName(
    name: string,
    limit = 10
  ): Promise<ApiResponse<{ carriers: HighwayCarrierInfo[]; total: number }>> {
    return this.request(`/carriers/search?name=${encodeURIComponent(name)}&limit=${limit}`)
  }

  /**
   * Get insurance details for a carrier
   */
  async getInsurance(dotNumber: string): Promise<ApiResponse<{ insurance: HighwayInsurance[] }>> {
    return this.request(`/carriers/dot/${dotNumber}/insurance`)
  }

  /**
   * Get safety rating for a carrier
   */
  async getSafetyRating(dotNumber: string): Promise<ApiResponse<HighwaySafetyRating>> {
    return this.request(`/carriers/dot/${dotNumber}/safety`)
  }

  /**
   * Monitor a carrier for changes (webhook registration)
   */
  async monitorCarrier(
    dotNumber: string,
    webhookUrl: string
  ): Promise<ApiResponse<{ monitor_id: string }>> {
    return this.request('/monitors', {
      method: 'POST',
      body: {
        dot_number: dotNumber,
        webhook_url: webhookUrl,
        events: ['authority_change', 'insurance_change', 'safety_change'],
      },
    })
  }

  /**
   * Stop monitoring a carrier
   */
  async stopMonitoring(monitorId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/monitors/${monitorId}`, {
      method: 'DELETE',
    })
  }
}

/**
 * Create a Highway client for an organization
 */
export async function createHighwayClient(
  organizationId: string
): Promise<HighwayClient | null> {
  const client = new HighwayClient(organizationId)
  const isConnected = await client.isConnected()

  if (!isConnected) {
    return null
  }

  return client
}

// Export types for use in other modules
export type {
  HighwayCarrierInfo,
  HighwayAuthorityStatus,
  HighwayInsurance,
  HighwaySafetyRating,
  HighwayCarrierResponse,
}
