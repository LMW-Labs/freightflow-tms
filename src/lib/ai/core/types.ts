// AI Core Types for VectrLoadAI

export type AIFeature =
  | 'rate_quote'
  | 'document_extraction'
  | 'carrier_matching'
  | 'email_drafting'
  | 'search'
  | 'alerts'

export type AIModel =
  | 'claude-sonnet-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-haiku-20240307'

export interface AILogEntry {
  id?: string
  organization_id: string
  user_id?: string
  feature: AIFeature
  request: Record<string, unknown>
  response?: Record<string, unknown>
  latency_ms?: number
  model: AIModel
  tokens_input?: number
  tokens_output?: number
  cost_usd?: number
  status: 'success' | 'error' | 'timeout'
  error_message?: string
  created_at?: string
}

// Document Extraction Types
export interface ExtractedDocumentData {
  document_type: 'pod' | 'bol' | 'rate_confirmation' | 'invoice' | 'lumper_receipt' | 'scale_ticket' | 'other'
  confidence: number

  // Common fields
  reference_number?: string
  date?: string

  // BOL/POD specific
  shipper_name?: string
  shipper_address?: string
  consignee_name?: string
  consignee_address?: string
  pickup_date?: string
  delivery_date?: string
  signature_present?: boolean
  damage_noted?: boolean
  damage_description?: string
  piece_count?: number
  weight?: number

  // Rate Con specific
  carrier_name?: string
  carrier_mc?: string
  rate_amount?: number
  pickup_location?: string
  delivery_location?: string

  // Invoice specific
  invoice_number?: string
  invoice_amount?: number
  due_date?: string

  // Lumper specific
  lumper_amount?: number
  lumper_company?: string

  // Scale ticket specific
  gross_weight?: number
  tare_weight?: number
  net_weight?: number

  // Raw extracted text
  raw_text?: string

  // Any additional fields AI found
  additional_fields?: Record<string, unknown>
}

// Rate Quote Types
export interface RateQuoteRequest {
  origin_city: string
  origin_state: string
  dest_city: string
  dest_state: string
  equipment_type: string
  weight?: number
  pickup_date?: string
  special_requirements?: string[]
}

export interface RateQuoteResponse {
  suggested_customer_rate: number
  suggested_carrier_rate: number
  predicted_margin_pct: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  market_data?: {
    dat_rate?: number
    truckstop_rate?: number
    market_trend?: 'up' | 'down' | 'stable'
  }
  historical_data?: {
    similar_loads_count: number
    avg_rate: number
    avg_margin: number
  }
}

// Carrier Matching Types
export interface CarrierMatchRequest {
  load_id: string
  origin_city: string
  origin_state: string
  dest_city: string
  dest_state: string
  equipment_type: string
  pickup_date: string
  weight?: number
  special_requirements?: string[]
}

export interface CarrierMatchResult {
  carrier_id: string
  carrier_name: string
  mc_number: string
  match_score: number
  reasoning: string
  factors: {
    lane_experience: number
    equipment_match: boolean
    availability_score: number
    performance_score: number
    rate_competitiveness: number
  }
  suggested_rate?: number
  estimated_response_time?: string
}

// Email Draft Types
export type EmailTemplateType =
  | 'rate_con'
  | 'dispatch'
  | 'invoice'
  | 'payment_reminder'
  | 'load_confirmation'
  | 'pod_request'
  | 'carrier_follow_up'
  | 'customer_update'

export interface EmailDraftRequest {
  template_type: EmailTemplateType
  context: {
    load_id?: string
    carrier_id?: string
    customer_id?: string
    invoice_id?: string
    additional_context?: string
  }
  tone?: 'professional' | 'friendly' | 'urgent'
}

export interface EmailDraftResponse {
  to_email: string
  subject: string
  body_html: string
  body_text: string
  suggested_attachments?: string[]
}

// Alert Types
export type AlertType =
  | 'no_movement'
  | 'off_route'
  | 'eta_slip'
  | 'pickup_overdue'
  | 'delivery_overdue'
  | 'no_check_call'
  | 'insurance_expiring'
  | 'authority_issue'
  | 'invoice_aging'
  | 'payment_due'
  | 'document_missing'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
  id?: string
  organization_id: string
  load_id?: string
  carrier_id?: string
  customer_id?: string
  invoice_id?: string
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  metadata?: Record<string, unknown>
  is_read?: boolean
  is_dismissed?: boolean
  dismissed_by?: string
  dismissed_at?: string
  snoozed_until?: string
  created_at?: string
  updated_at?: string
}

// Cost calculation per model (as of 2024)
export const MODEL_COSTS = {
  'claude-sonnet-4-20250514': {
    input_per_1k: 0.003,
    output_per_1k: 0.015,
  },
  'claude-3-5-sonnet-20241022': {
    input_per_1k: 0.003,
    output_per_1k: 0.015,
  },
  'claude-3-haiku-20240307': {
    input_per_1k: 0.00025,
    output_per_1k: 0.00125,
  },
} as const

export function calculateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model]
  return (inputTokens / 1000) * costs.input_per_1k +
         (outputTokens / 1000) * costs.output_per_1k
}
