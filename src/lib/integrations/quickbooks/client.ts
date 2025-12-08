import { OAuthIntegrationClient } from '../core/base-client'
import type { ApiResponse } from '../core/types'
import { decrypt } from '../core/encryption'
import { createClient } from '@/lib/supabase/server'

const QBO_BASE_URL = 'https://quickbooks.api.intuit.com/v3/company'
const QBO_SANDBOX_URL = 'https://sandbox-quickbooks.api.intuit.com/v3/company'

interface QBOCustomer {
  Id?: string
  DisplayName: string
  CompanyName?: string
  PrimaryEmailAddr?: { Address: string }
  PrimaryPhone?: { FreeFormNumber: string }
  BillAddr?: {
    Line1?: string
    City?: string
    CountrySubDivisionCode?: string
    PostalCode?: string
  }
  Active?: boolean
  SyncToken?: string
}

interface QBOInvoice {
  Id?: string
  DocNumber?: string
  CustomerRef: { value: string; name?: string }
  Line: Array<{
    Amount: number
    DetailType: 'SalesItemLineDetail' | 'DescriptionOnly'
    SalesItemLineDetail?: {
      ItemRef: { value: string; name?: string }
      Qty?: number
      UnitPrice?: number
    }
    Description?: string
  }>
  TxnDate?: string
  DueDate?: string
  PrivateNote?: string
  TotalAmt?: number
}

interface QBOBill {
  Id?: string
  VendorRef: { value: string; name?: string }
  Line: Array<{
    Amount: number
    DetailType: 'AccountBasedExpenseLineDetail'
    AccountBasedExpenseLineDetail: {
      AccountRef: { value: string; name?: string }
    }
    Description?: string
  }>
  TxnDate?: string
  DueDate?: string
  PrivateNote?: string
}

/**
 * QuickBooks Online API Client
 * Handles OAuth token refresh and API requests
 */
export class QuickBooksClient extends OAuthIntegrationClient {
  private realmId: string = ''
  private useSandbox: boolean = false

  constructor(organizationId: string) {
    super(
      {
        provider: 'quickbooks',
        baseUrl: '', // Set dynamically after initialization
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      },
      organizationId
    )
    this.useSandbox = process.env.QUICKBOOKS_USE_SANDBOX === 'true'
  }

  /**
   * Initialize the client - must be called before making API calls
   */
  async initialize(): Promise<boolean> {
    const integration = await this.loadIntegration()
    if (!integration || integration.status !== 'connected') {
      return false
    }

    this.realmId = integration.external_account_id || ''
    // Update base URL with realm ID
    this.config.baseUrl = this.useSandbox
      ? `${QBO_SANDBOX_URL}/${this.realmId}`
      : `${QBO_BASE_URL}/${this.realmId}`

    return true
  }

  protected getOAuthConfig() {
    return {
      clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
      clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    }
  }

  // ===== CUSTOMER OPERATIONS =====

  /**
   * Query customers from QuickBooks
   */
  async queryCustomers(
    startPosition = 1,
    maxResults = 100
  ): Promise<ApiResponse<QBOCustomer[]>> {
    const query = `SELECT * FROM Customer STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
    const response = await this.request<{
      QueryResponse: { Customer?: QBOCustomer[] }
    }>(`/query?query=${encodeURIComponent(query)}`)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.QueryResponse.Customer || [],
      }
    }

    return { success: false, error: response.error }
  }

  /**
   * Find a customer by display name
   */
  async findCustomerByName(
    displayName: string
  ): Promise<ApiResponse<QBOCustomer | null>> {
    const query = `SELECT * FROM Customer WHERE DisplayName = '${displayName.replace(/'/g, "\\'")}'`
    const response = await this.request<{
      QueryResponse: { Customer?: QBOCustomer[] }
    }>(`/query?query=${encodeURIComponent(query)}`)

    if (response.success && response.data) {
      const customers = response.data.QueryResponse.Customer || []
      return {
        success: true,
        data: customers.length > 0 ? customers[0] : null,
      }
    }

    return { success: false, error: response.error }
  }

  /**
   * Create a customer in QuickBooks
   */
  async createCustomer(
    customer: Omit<QBOCustomer, 'Id'>
  ): Promise<ApiResponse<QBOCustomer>> {
    return this.request<{ Customer: QBOCustomer }>('/customer', {
      method: 'POST',
      body: customer,
    }).then((res) => ({
      success: res.success,
      data: res.data?.Customer,
      error: res.error,
    }))
  }

  /**
   * Update a customer in QuickBooks
   */
  async updateCustomer(
    customer: QBOCustomer & { SyncToken: string }
  ): Promise<ApiResponse<QBOCustomer>> {
    return this.request<{ Customer: QBOCustomer }>('/customer', {
      method: 'POST',
      body: customer,
    }).then((res) => ({
      success: res.success,
      data: res.data?.Customer,
      error: res.error,
    }))
  }

  // ===== INVOICE OPERATIONS =====

  /**
   * Create an invoice in QuickBooks
   */
  async createInvoice(
    invoice: Omit<QBOInvoice, 'Id'>
  ): Promise<ApiResponse<QBOInvoice>> {
    return this.request<{ Invoice: QBOInvoice }>('/invoice', {
      method: 'POST',
      body: invoice,
    }).then((res) => ({
      success: res.success,
      data: res.data?.Invoice,
      error: res.error,
    }))
  }

  /**
   * Get an invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<ApiResponse<QBOInvoice>> {
    return this.request<{ Invoice: QBOInvoice }>(`/invoice/${invoiceId}`).then(
      (res) => ({
        success: res.success,
        data: res.data?.Invoice,
        error: res.error,
      })
    )
  }

  /**
   * Query invoices from QuickBooks
   */
  async queryInvoices(
    startPosition = 1,
    maxResults = 100
  ): Promise<ApiResponse<QBOInvoice[]>> {
    const query = `SELECT * FROM Invoice STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
    const response = await this.request<{
      QueryResponse: { Invoice?: QBOInvoice[] }
    }>(`/query?query=${encodeURIComponent(query)}`)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.QueryResponse.Invoice || [],
      }
    }

    return { success: false, error: response.error }
  }

  // ===== BILL OPERATIONS (Carrier Payments) =====

  /**
   * Create a bill in QuickBooks (for carrier payments)
   */
  async createBill(bill: Omit<QBOBill, 'Id'>): Promise<ApiResponse<QBOBill>> {
    return this.request<{ Bill: QBOBill }>('/bill', {
      method: 'POST',
      body: bill,
    }).then((res) => ({
      success: res.success,
      data: res.data?.Bill,
      error: res.error,
    }))
  }

  /**
   * Query vendors (carriers) from QuickBooks
   */
  async queryVendors(
    startPosition = 1,
    maxResults = 100
  ): Promise<
    ApiResponse<Array<{ Id: string; DisplayName: string; Active: boolean }>>
  > {
    const query = `SELECT * FROM Vendor STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`
    const response = await this.request<{
      QueryResponse: {
        Vendor?: Array<{ Id: string; DisplayName: string; Active: boolean }>
      }
    }>(`/query?query=${encodeURIComponent(query)}`)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.QueryResponse.Vendor || [],
      }
    }

    return { success: false, error: response.error }
  }

  /**
   * Create a vendor in QuickBooks (for carriers)
   */
  async createVendor(vendor: {
    DisplayName: string
    CompanyName?: string
    PrimaryEmailAddr?: { Address: string }
    PrimaryPhone?: { FreeFormNumber: string }
  }): Promise<ApiResponse<{ Id: string; DisplayName: string }>> {
    return this.request<{ Vendor: { Id: string; DisplayName: string } }>(
      '/vendor',
      {
        method: 'POST',
        body: vendor,
      }
    ).then((res) => ({
      success: res.success,
      data: res.data?.Vendor,
      error: res.error,
    }))
  }

  // ===== ACCOUNT OPERATIONS =====

  /**
   * Query expense accounts for bill creation
   */
  async queryExpenseAccounts(): Promise<
    ApiResponse<Array<{ Id: string; Name: string; AccountType: string }>>
  > {
    const query = `SELECT * FROM Account WHERE AccountType = 'Expense'`
    const response = await this.request<{
      QueryResponse: {
        Account?: Array<{ Id: string; Name: string; AccountType: string }>
      }
    }>(`/query?query=${encodeURIComponent(query)}`)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.QueryResponse.Account || [],
      }
    }

    return { success: false, error: response.error }
  }

  /**
   * Query items for invoice line items
   */
  async queryItems(): Promise<
    ApiResponse<Array<{ Id: string; Name: string; Type: string }>>
  > {
    const query = `SELECT * FROM Item WHERE Type = 'Service'`
    const response = await this.request<{
      QueryResponse: {
        Item?: Array<{ Id: string; Name: string; Type: string }>
      }
    }>(`/query?query=${encodeURIComponent(query)}`)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data.QueryResponse.Item || [],
      }
    }

    return { success: false, error: response.error }
  }

  // ===== COMPANY INFO =====

  /**
   * Get company information
   */
  async getCompanyInfo(): Promise<
    ApiResponse<{ CompanyName: string; Country: string }>
  > {
    return this.request<{
      CompanyInfo: { CompanyName: string; Country: string }
    }>(`/companyinfo/${this.realmId}`).then((res) => ({
      success: res.success,
      data: res.data?.CompanyInfo,
      error: res.error,
    }))
  }
}

/**
 * Create a QuickBooks client for an organization
 */
export async function createQuickBooksClient(
  organizationId: string
): Promise<QuickBooksClient | null> {
  const client = new QuickBooksClient(organizationId)
  const initialized = await client.initialize()

  if (!initialized) {
    return null
  }

  return client
}
