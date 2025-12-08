import { ApiKeyIntegrationClient } from '../core/base-client'
import type { ApiResponse } from '../core/types'

const DENIM_BASE_URL = 'https://api.denim.com/v1'
const DENIM_SANDBOX_URL = 'https://sandbox-api.denim.com/v1'

// Payment status types
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'scheduled'
  | 'paid'
  | 'failed'
  | 'cancelled'

export type PaymentMethod = 'ach' | 'wire' | 'check' | 'fuel_card' | 'quickpay'

export interface CarrierPayment {
  id: string
  external_id?: string
  carrier: {
    id: string
    name: string
    mc_number?: string
    dot_number?: string
  }
  amount: number
  currency: string
  status: PaymentStatus
  payment_method: PaymentMethod
  reference_number?: string
  load_reference?: string
  description?: string
  bank_account?: {
    routing_number: string
    account_number_last4: string
    account_type: 'checking' | 'savings'
  }
  scheduled_date?: string
  paid_date?: string
  fee_amount?: number
  net_amount?: number
  created_at: string
  updated_at: string
}

export interface CreatePaymentRequest {
  external_id: string
  carrier_id: string
  amount: number
  currency?: string
  payment_method: PaymentMethod
  reference_number?: string
  load_reference?: string
  description?: string
  scheduled_date?: string
  quickpay_discount_percent?: number
}

export interface CarrierBankAccount {
  id: string
  carrier_id: string
  bank_name: string
  routing_number: string
  account_number_last4: string
  account_type: 'checking' | 'savings'
  is_primary: boolean
  is_verified: boolean
  created_at: string
}

export interface DenimCarrier {
  id: string
  external_id?: string
  name: string
  mc_number?: string
  dot_number?: string
  email?: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }
  bank_accounts?: CarrierBankAccount[]
  payment_terms?: number
  quickpay_enabled: boolean
  quickpay_fee_percent?: number
  total_paid: number
  pending_amount: number
  created_at: string
}

export interface PaymentSummary {
  total_pending: number
  total_processing: number
  total_scheduled: number
  total_paid_mtd: number
  total_paid_ytd: number
  payment_count_mtd: number
  average_payment_mtd: number
}

/**
 * Denim Carrier Payments API Client
 * Handles carrier payments, QuickPay, and bank account management
 */
export class DenimClient extends ApiKeyIntegrationClient {
  private useSandbox: boolean

  constructor(organizationId: string) {
    const useSandbox = process.env.DENIM_USE_SANDBOX === 'true'
    super(
      {
        provider: 'denim',
        baseUrl: useSandbox ? DENIM_SANDBOX_URL : DENIM_BASE_URL,
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      organizationId
    )
    this.useSandbox = useSandbox
  }

  protected getApiKeyHeader(): string {
    return 'Authorization'
  }

  /**
   * Override to format API key as Bearer token
   */
  protected async getAuthorizationHeader(): Promise<string | null> {
    const apiKey = await this.getApiKey()
    if (!apiKey) return null
    return `Bearer ${apiKey}`
  }

  // ===== PAYMENT OPERATIONS =====

  /**
   * Create a new carrier payment
   */
  async createPayment(
    request: CreatePaymentRequest
  ): Promise<ApiResponse<CarrierPayment>> {
    return this.request<CarrierPayment>('/payments', {
      method: 'POST',
      body: {
        external_reference_id: request.external_id,
        carrier_id: request.carrier_id,
        amount: request.amount,
        currency: request.currency || 'USD',
        payment_method: request.payment_method,
        reference_number: request.reference_number,
        load_reference: request.load_reference,
        description: request.description,
        scheduled_date: request.scheduled_date,
        quickpay: request.quickpay_discount_percent
          ? {
              enabled: true,
              discount_percent: request.quickpay_discount_percent,
            }
          : undefined,
      },
    })
  }

  /**
   * Get payment details by ID
   */
  async getPayment(paymentId: string): Promise<ApiResponse<CarrierPayment>> {
    return this.request<CarrierPayment>(`/payments/${paymentId}`)
  }

  /**
   * Get payment by external reference ID
   */
  async getPaymentByExternalId(
    externalId: string
  ): Promise<ApiResponse<CarrierPayment>> {
    return this.request<CarrierPayment>(`/payments/external/${externalId}`)
  }

  /**
   * List payments with optional filters
   */
  async listPayments(options?: {
    carrier_id?: string
    status?: PaymentStatus
    from_date?: string
    to_date?: string
    page?: number
    per_page?: number
  }): Promise<ApiResponse<{ payments: CarrierPayment[]; total: number }>> {
    const params = new URLSearchParams()
    if (options?.carrier_id) params.set('carrier_id', options.carrier_id)
    if (options?.status) params.set('status', options.status)
    if (options?.from_date) params.set('from_date', options.from_date)
    if (options?.to_date) params.set('to_date', options.to_date)
    if (options?.page) params.set('page', options.page.toString())
    if (options?.per_page) params.set('per_page', options.per_page.toString())

    const query = params.toString()
    return this.request<{ payments: CarrierPayment[]; total: number }>(
      `/payments${query ? `?${query}` : ''}`
    )
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(paymentId: string): Promise<ApiResponse<CarrierPayment>> {
    return this.request<CarrierPayment>(`/payments/${paymentId}/cancel`, {
      method: 'POST',
    })
  }

  /**
   * Approve a payment for processing
   */
  async approvePayment(paymentId: string): Promise<ApiResponse<CarrierPayment>> {
    return this.request<CarrierPayment>(`/payments/${paymentId}/approve`, {
      method: 'POST',
    })
  }

  /**
   * Get payment summary/statistics
   */
  async getPaymentSummary(): Promise<ApiResponse<PaymentSummary>> {
    return this.request<PaymentSummary>('/payments/summary')
  }

  // ===== CARRIER OPERATIONS =====

  /**
   * Create or update a carrier in Denim
   */
  async upsertCarrier(carrier: {
    external_id: string
    name: string
    mc_number?: string
    dot_number?: string
    email?: string
    phone?: string
    address?: {
      street?: string
      city?: string
      state?: string
      postal_code?: string
      country?: string
    }
    payment_terms?: number
    quickpay_enabled?: boolean
    quickpay_fee_percent?: number
  }): Promise<ApiResponse<DenimCarrier>> {
    return this.request<DenimCarrier>('/carriers', {
      method: 'POST',
      body: carrier,
    })
  }

  /**
   * Get carrier details by ID
   */
  async getCarrier(carrierId: string): Promise<ApiResponse<DenimCarrier>> {
    return this.request<DenimCarrier>(`/carriers/${carrierId}`)
  }

  /**
   * Get carrier by external ID
   */
  async getCarrierByExternalId(
    externalId: string
  ): Promise<ApiResponse<DenimCarrier>> {
    return this.request<DenimCarrier>(`/carriers/external/${externalId}`)
  }

  /**
   * List all carriers
   */
  async listCarriers(options?: {
    page?: number
    per_page?: number
    search?: string
  }): Promise<ApiResponse<{ carriers: DenimCarrier[]; total: number }>> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', options.page.toString())
    if (options?.per_page) params.set('per_page', options.per_page.toString())
    if (options?.search) params.set('search', options.search)

    const query = params.toString()
    return this.request<{ carriers: DenimCarrier[]; total: number }>(
      `/carriers${query ? `?${query}` : ''}`
    )
  }

  // ===== BANK ACCOUNT OPERATIONS =====

  /**
   * Get carrier's bank accounts
   */
  async getCarrierBankAccounts(
    carrierId: string
  ): Promise<ApiResponse<CarrierBankAccount[]>> {
    return this.request<CarrierBankAccount[]>(`/carriers/${carrierId}/bank-accounts`)
  }

  /**
   * Add a bank account for a carrier
   */
  async addBankAccount(
    carrierId: string,
    account: {
      bank_name: string
      routing_number: string
      account_number: string
      account_type: 'checking' | 'savings'
      is_primary?: boolean
    }
  ): Promise<ApiResponse<CarrierBankAccount>> {
    return this.request<CarrierBankAccount>(`/carriers/${carrierId}/bank-accounts`, {
      method: 'POST',
      body: account,
    })
  }

  /**
   * Verify a bank account with micro-deposits
   */
  async verifyBankAccount(
    carrierId: string,
    accountId: string,
    amounts: [number, number]
  ): Promise<ApiResponse<CarrierBankAccount>> {
    return this.request<CarrierBankAccount>(
      `/carriers/${carrierId}/bank-accounts/${accountId}/verify`,
      {
        method: 'POST',
        body: { amounts },
      }
    )
  }

  /**
   * Delete a bank account
   */
  async deleteBankAccount(
    carrierId: string,
    accountId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(
      `/carriers/${carrierId}/bank-accounts/${accountId}`,
      { method: 'DELETE' }
    )
  }

  // ===== QUICKPAY OPERATIONS =====

  /**
   * Calculate QuickPay discount for a payment
   */
  async calculateQuickPay(
    amount: number,
    carrierId: string
  ): Promise<ApiResponse<{
    original_amount: number
    discount_percent: number
    discount_amount: number
    net_amount: number
    estimated_payment_date: string
  }>> {
    return this.request(`/quickpay/calculate`, {
      method: 'POST',
      body: { amount, carrier_id: carrierId },
    })
  }

  /**
   * Convert a standard payment to QuickPay
   */
  async convertToQuickPay(
    paymentId: string
  ): Promise<ApiResponse<CarrierPayment>> {
    return this.request<CarrierPayment>(`/payments/${paymentId}/quickpay`, {
      method: 'POST',
    })
  }

  // ===== REPORTING =====

  /**
   * Get payment history for a carrier
   */
  async getCarrierPaymentHistory(
    carrierId: string,
    options?: {
      from_date?: string
      to_date?: string
      limit?: number
    }
  ): Promise<ApiResponse<CarrierPayment[]>> {
    const params = new URLSearchParams()
    if (options?.from_date) params.set('from_date', options.from_date)
    if (options?.to_date) params.set('to_date', options.to_date)
    if (options?.limit) params.set('limit', options.limit.toString())

    const query = params.toString()
    return this.request<CarrierPayment[]>(
      `/carriers/${carrierId}/payments${query ? `?${query}` : ''}`
    )
  }

  /**
   * Export payments to CSV
   */
  async exportPayments(options?: {
    from_date?: string
    to_date?: string
    status?: PaymentStatus
  }): Promise<ApiResponse<{ download_url: string; expires_at: string }>> {
    return this.request('/payments/export', {
      method: 'POST',
      body: options || {},
    })
  }
}

/**
 * Create a Denim client for an organization
 */
export async function createDenimClient(
  organizationId: string
): Promise<DenimClient | null> {
  const client = new DenimClient(organizationId)
  const connected = await client.isConnected()

  if (!connected) {
    return null
  }

  return client
}
