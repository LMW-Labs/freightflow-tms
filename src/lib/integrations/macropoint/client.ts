import { ApiKeyIntegrationClient } from '../core/base-client'
import type { ApiResponse } from '../core/types'

const MACROPOINT_BASE_URL = 'https://api.macropoint.com/v1'

// Macropoint tracking status types
export type TrackingStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_response'

export interface MacropointLocation {
  latitude: number
  longitude: number
  timestamp: string
  city?: string
  state?: string
  country?: string
  speed_mph?: number
  heading?: string
  address?: string
}

export interface MacropointETA {
  destination_eta: string
  pickup_eta?: string
  confidence: 'high' | 'medium' | 'low'
  distance_miles?: number
  estimated_hours?: number
}

export interface TrackingOrder {
  order_id: string
  external_id?: string
  status: TrackingStatus
  driver_phone: string
  driver_name?: string
  carrier_name?: string
  carrier_mc?: string
  pickup_location: {
    address?: string
    city: string
    state: string
    postal_code?: string
    country?: string
    latitude?: number
    longitude?: number
    appointment_start?: string
    appointment_end?: string
  }
  delivery_location: {
    address?: string
    city: string
    state: string
    postal_code?: string
    country?: string
    latitude?: number
    longitude?: number
    appointment_start?: string
    appointment_end?: string
  }
  current_location?: MacropointLocation
  eta?: MacropointETA
  last_update?: string
  created_at: string
  completed_at?: string
  tracking_url?: string
}

export interface CreateTrackingRequest {
  external_id: string
  driver_phone: string
  driver_name?: string
  carrier_name?: string
  carrier_mc?: string
  pickup: {
    address?: string
    city: string
    state: string
    postal_code?: string
    country?: string
    latitude?: number
    longitude?: number
    appointment_start?: string
    appointment_end?: string
  }
  delivery: {
    address?: string
    city: string
    state: string
    postal_code?: string
    country?: string
    latitude?: number
    longitude?: number
    appointment_start?: string
    appointment_end?: string
  }
  notification_email?: string
  notification_webhook?: string
}

export interface TrackingUpdate {
  order_id: string
  location: MacropointLocation
  eta?: MacropointETA
  status: TrackingStatus
  events?: Array<{
    type: string
    timestamp: string
    description: string
    location?: MacropointLocation
  }>
}

/**
 * Macropoint Real-Time Freight Visibility API Client
 * Provides driver tracking, ETA predictions, and location updates
 */
export class MacropointClient extends ApiKeyIntegrationClient {
  constructor(organizationId: string) {
    super(
      {
        provider: 'macropoint',
        baseUrl: MACROPOINT_BASE_URL,
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
   * Override to format API key correctly for Macropoint
   */
  protected async getAuthorizationHeader(): Promise<string | null> {
    const apiKey = await this.getApiKey()
    if (!apiKey) return null
    // Macropoint uses X-API-Key header, not Authorization
    return null
  }

  /**
   * Override request to add X-API-Key header
   */
  protected async request<T = unknown>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      headers?: Record<string, string>
      body?: unknown
      timeout?: number
      retries?: number
      retryDelay?: number
    } = {}
  ): Promise<ApiResponse<T>> {
    const apiKey = await this.getApiKey()
    if (!apiKey) {
      return {
        success: false,
        error: { code: 'NO_API_KEY', message: 'Macropoint API key not configured' },
      }
    }

    const headers = {
      ...options.headers,
      'X-API-Key': apiKey,
    }

    return super.request<T>(endpoint, { ...options, headers })
  }

  // ===== TRACKING ORDER OPERATIONS =====

  /**
   * Create a new tracking order for a load
   */
  async createTrackingOrder(
    request: CreateTrackingRequest
  ): Promise<ApiResponse<TrackingOrder>> {
    return this.request<TrackingOrder>('/orders', {
      method: 'POST',
      body: {
        external_reference_id: request.external_id,
        driver: {
          phone_number: request.driver_phone,
          name: request.driver_name,
        },
        carrier: {
          name: request.carrier_name,
          mc_number: request.carrier_mc,
        },
        stops: [
          {
            type: 'pickup',
            address: {
              street: request.pickup.address,
              city: request.pickup.city,
              state: request.pickup.state,
              postal_code: request.pickup.postal_code,
              country: request.pickup.country || 'US',
            },
            coordinates: request.pickup.latitude && request.pickup.longitude
              ? { lat: request.pickup.latitude, lng: request.pickup.longitude }
              : undefined,
            appointment: {
              start: request.pickup.appointment_start,
              end: request.pickup.appointment_end,
            },
          },
          {
            type: 'delivery',
            address: {
              street: request.delivery.address,
              city: request.delivery.city,
              state: request.delivery.state,
              postal_code: request.delivery.postal_code,
              country: request.delivery.country || 'US',
            },
            coordinates: request.delivery.latitude && request.delivery.longitude
              ? { lat: request.delivery.latitude, lng: request.delivery.longitude }
              : undefined,
            appointment: {
              start: request.delivery.appointment_start,
              end: request.delivery.appointment_end,
            },
          },
        ],
        notifications: {
          email: request.notification_email,
          webhook_url: request.notification_webhook,
        },
      },
    })
  }

  /**
   * Get tracking order details by order ID
   */
  async getTrackingOrder(orderId: string): Promise<ApiResponse<TrackingOrder>> {
    return this.request<TrackingOrder>(`/orders/${orderId}`)
  }

  /**
   * Get tracking order by external reference ID
   */
  async getTrackingByExternalId(
    externalId: string
  ): Promise<ApiResponse<TrackingOrder>> {
    return this.request<TrackingOrder>(`/orders/external/${externalId}`)
  }

  /**
   * Cancel a tracking order
   */
  async cancelTrackingOrder(orderId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/orders/${orderId}/cancel`, {
      method: 'POST',
    })
  }

  /**
   * Get latest location update for an order
   */
  async getLatestLocation(orderId: string): Promise<ApiResponse<MacropointLocation>> {
    return this.request<MacropointLocation>(`/orders/${orderId}/location`)
  }

  /**
   * Get location history for an order
   */
  async getLocationHistory(
    orderId: string,
    options?: {
      start_time?: string
      end_time?: string
      limit?: number
    }
  ): Promise<ApiResponse<MacropointLocation[]>> {
    const params = new URLSearchParams()
    if (options?.start_time) params.set('start_time', options.start_time)
    if (options?.end_time) params.set('end_time', options.end_time)
    if (options?.limit) params.set('limit', options.limit.toString())

    const query = params.toString()
    return this.request<MacropointLocation[]>(
      `/orders/${orderId}/locations${query ? `?${query}` : ''}`
    )
  }

  /**
   * Get ETA for an order
   */
  async getETA(orderId: string): Promise<ApiResponse<MacropointETA>> {
    return this.request<MacropointETA>(`/orders/${orderId}/eta`)
  }

  /**
   * List active tracking orders
   */
  async listActiveOrders(
    options?: {
      page?: number
      per_page?: number
      status?: TrackingStatus
    }
  ): Promise<ApiResponse<{ orders: TrackingOrder[]; total: number }>> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', options.page.toString())
    if (options?.per_page) params.set('per_page', options.per_page.toString())
    if (options?.status) params.set('status', options.status)

    const query = params.toString()
    return this.request<{ orders: TrackingOrder[]; total: number }>(
      `/orders${query ? `?${query}` : ''}`
    )
  }

  /**
   * Update tracking order with new driver info
   */
  async updateDriverInfo(
    orderId: string,
    update: {
      driver_phone?: string
      driver_name?: string
    }
  ): Promise<ApiResponse<TrackingOrder>> {
    return this.request<TrackingOrder>(`/orders/${orderId}/driver`, {
      method: 'PATCH',
      body: {
        phone_number: update.driver_phone,
        name: update.driver_name,
      },
    })
  }

  /**
   * Request driver check-in (sends SMS to driver)
   */
  async requestCheckIn(orderId: string): Promise<ApiResponse<{ sent: boolean }>> {
    return this.request<{ sent: boolean }>(`/orders/${orderId}/checkin`, {
      method: 'POST',
    })
  }

  /**
   * Get geofence events for an order
   */
  async getGeofenceEvents(
    orderId: string
  ): Promise<ApiResponse<Array<{
    type: 'arrival' | 'departure'
    location_type: 'pickup' | 'delivery'
    timestamp: string
    location: MacropointLocation
  }>>> {
    return this.request(`/orders/${orderId}/geofence-events`)
  }
}

/**
 * Create a Macropoint client for an organization
 */
export async function createMacropointClient(
  organizationId: string
): Promise<MacropointClient | null> {
  const client = new MacropointClient(organizationId)
  const connected = await client.isConnected()

  if (!connected) {
    return null
  }

  return client
}
