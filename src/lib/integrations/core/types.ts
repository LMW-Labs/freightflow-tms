// Integration Types

export type IntegrationProvider =
  | 'quickbooks'
  | 'dat'
  | 'truckstop'
  | 'highway'
  | 'macropoint'
  | 'denim'

export type IntegrationStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'expired'

export type SyncStatus = 'success' | 'partial' | 'error'

export type SyncDirection = 'push' | 'pull' | 'webhook'

export type TriggerType = 'manual' | 'auto' | 'webhook' | 'schedule'

export interface IntegrationConfig {
  provider: IntegrationProvider
  name: string
  description: string
  icon: string
  category: 'accounting' | 'loadboard' | 'carrier' | 'tracking' | 'payments'
  authType: 'oauth2' | 'api_key' | 'credentials'
  features: string[]
  docsUrl?: string
}

export interface OrganizationIntegration {
  id: string
  organization_id: string
  provider: IntegrationProvider
  status: IntegrationStatus
  external_account_id: string | null
  external_account_name: string | null
  config: Record<string, unknown>
  last_sync_at: string | null
  last_sync_status: SyncStatus | null
  last_sync_message: string | null
  last_error: string | null
  last_error_at: string | null
  error_count: number
  connected_at: string | null
  connected_by: string | null
  created_at: string
  updated_at: string
}

export interface IntegrationSyncLog {
  id: string
  organization_id: string
  integration_id: string
  operation: string
  direction: SyncDirection
  status: 'pending' | 'running' | 'success' | 'error'
  related_table: string | null
  related_id: string | null
  external_id: string | null
  request_summary: Record<string, unknown> | null
  response_summary: Record<string, unknown> | null
  error_code: string | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  triggered_by: string | null
  trigger_type: TriggerType | null
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

// OAuth types
export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
}

// Rate lookup types
export interface RateLookupRequest {
  origin_city: string
  origin_state: string
  origin_zip?: string
  dest_city: string
  dest_state: string
  dest_zip?: string
  equipment_type: string
  pickup_date?: string
}

export interface RateLookupResult {
  provider: 'dat' | 'truckstop'
  rate_per_mile: number
  total_rate: number
  mileage: number
  market_low: number
  market_high: number
  market_avg: number
  fuel_surcharge?: number
  rate_date: string
  valid_until?: string
}

// Carrier verification types
export interface CarrierVerificationRequest {
  mc_number?: string
  dot_number?: string
  carrier_id: string
}

export interface CarrierVerificationResult {
  status: 'verified' | 'failed' | 'flagged'
  authority_status: string
  insurance_status: string
  insurance_expires_at?: string
  cargo_coverage?: number
  liability_coverage?: number
  safety_score?: number
  safety_rating?: string
  out_of_service_percentage?: number
  flags: string[]
  is_blocked: boolean
  block_reason?: string
}

// Tracking types
export interface TrackingRequest {
  load_id: string
  driver_phone: string
  carrier_id: string
}

export interface TrackingLocation {
  lat: number
  lng: number
  timestamp: string
  city?: string
  state?: string
  speed?: number
  heading?: number
}

export interface TrackingStatus {
  session_id: string
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled' | 'error'
  current_location?: TrackingLocation
  eta?: string
  last_error?: string
}

// Payment types
export interface PaymentRequest {
  load_id: string
  carrier_id: string
  invoice_id?: string
  amount: number
  payment_type: 'standard' | 'quickpay' | 'factoring'
}

export interface PaymentResult {
  payment_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  amount: number
  fee_amount: number
  net_amount: number
  scheduled_date?: string
  processed_at?: string
}

// Integration provider configurations
export const INTEGRATION_CONFIGS: Record<IntegrationProvider, IntegrationConfig> = {
  quickbooks: {
    provider: 'quickbooks',
    name: 'QuickBooks Online',
    description: 'Sync invoices, customers, and payments with QuickBooks',
    icon: 'file-text',
    category: 'accounting',
    authType: 'oauth2',
    features: [
      'Sync customers to QuickBooks',
      'Push invoices automatically',
      'Track payment status',
      'Carrier payments as bills',
    ],
    docsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
  },
  dat: {
    provider: 'dat',
    name: 'DAT Load Board',
    description: 'Search rates and post loads to DAT',
    icon: 'truck',
    category: 'loadboard',
    authType: 'api_key',
    features: [
      'Market rate lookups',
      'Post loads to DAT',
      'Lane rate history',
      'Margin calculations',
    ],
    docsUrl: 'https://developer.dat.com/',
  },
  truckstop: {
    provider: 'truckstop',
    name: 'Truckstop',
    description: 'Search rates and post loads to Truckstop',
    icon: 'truck',
    category: 'loadboard',
    authType: 'api_key',
    features: [
      'Market rate lookups',
      'Post loads to Truckstop',
      'Lane rate history',
      'Carrier search',
    ],
    docsUrl: 'https://truckstop.com/solutions/developers/',
  },
  highway: {
    provider: 'highway',
    name: 'Highway',
    description: 'Automated carrier vetting and compliance',
    icon: 'shield-check',
    category: 'carrier',
    authType: 'api_key',
    features: [
      'Authority verification',
      'Insurance verification',
      'Safety score checks',
      'Automatic re-verification',
    ],
    docsUrl: 'https://www.highwayhealth.io/',
  },
  macropoint: {
    provider: 'macropoint',
    name: 'Macropoint',
    description: 'Real-time load tracking',
    icon: 'map-pin',
    category: 'tracking',
    authType: 'api_key',
    features: [
      'Real-time GPS tracking',
      'ELD integration',
      'ETA predictions',
      'Location history',
    ],
    docsUrl: 'https://www.project44.com/visibility-platform/macropoint/',
  },
  denim: {
    provider: 'denim',
    name: 'Denim',
    description: 'Carrier payment processing and factoring',
    icon: 'credit-card',
    category: 'payments',
    authType: 'api_key',
    features: [
      'Carrier payments',
      'QuickPay option',
      'Factoring integration',
      'Payment status tracking',
    ],
    docsUrl: 'https://www.dfreinc.com/',
  },
}
