import { createClient } from '@/lib/supabase/server'
import { decrypt, decryptTokens, encrypt, isTokenExpired } from './encryption'
import { IntegrationSyncLogger, logIntegration, updateIntegrationSyncStatus } from './logger'
import type {
  ApiResponse,
  IntegrationProvider,
  OrganizationIntegration,
  SyncDirection,
  TriggerType,
} from './types'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  retries?: number
  retryDelay?: number
}

export interface ClientConfig {
  provider: IntegrationProvider
  baseUrl: string
  defaultHeaders?: Record<string, string>
  timeout?: number
  maxRetries?: number
  retryDelay?: number
}

/**
 * Abstract base class for all integration clients
 * Provides common functionality: auth, retry logic, error handling, logging
 */
export abstract class BaseIntegrationClient {
  protected config: ClientConfig
  protected integration: OrganizationIntegration | null = null
  protected organizationId: string

  constructor(config: ClientConfig, organizationId: string) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    }
    this.organizationId = organizationId
  }

  /**
   * Load the integration record from the database
   */
  async loadIntegration(): Promise<OrganizationIntegration | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('organization_integrations')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('provider', this.config.provider)
      .single()

    if (error || !data) {
      return null
    }

    this.integration = data as OrganizationIntegration
    return this.integration
  }

  /**
   * Check if the integration is connected and ready to use
   */
  async isConnected(): Promise<boolean> {
    const integration = await this.loadIntegration()
    return integration?.status === 'connected'
  }

  /**
   * Get the access token, refreshing if necessary (for OAuth integrations)
   */
  protected async getAccessToken(): Promise<string | null> {
    if (!this.integration) {
      await this.loadIntegration()
    }

    if (!this.integration) {
      return null
    }

    const supabase = await createClient()

    // Check if we have encrypted tokens
    const { data } = await supabase
      .from('organization_integrations')
      .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
      .eq('id', this.integration.id)
      .single()

    if (!data?.access_token_encrypted) {
      return null
    }

    // Check if token is expired
    if (data.token_expires_at && isTokenExpired(new Date(data.token_expires_at))) {
      // Token is expired, try to refresh
      if (data.refresh_token_encrypted) {
        try {
          const newTokens = await this.refreshTokens(decrypt(data.refresh_token_encrypted))
          return newTokens.access_token
        } catch (error) {
          logIntegration(this.config.provider, 'getAccessToken', 'error', 'Failed to refresh token', {
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          // Mark integration as expired
          await supabase
            .from('organization_integrations')
            .update({ status: 'expired' })
            .eq('id', this.integration.id)
          return null
        }
      }
      return null
    }

    return decrypt(data.access_token_encrypted)
  }

  /**
   * Get API key for API key based integrations
   */
  protected async getApiKey(): Promise<string | null> {
    if (!this.integration) {
      await this.loadIntegration()
    }

    if (!this.integration) {
      return null
    }

    const supabase = await createClient()

    const { data } = await supabase
      .from('organization_integrations')
      .select('credentials_encrypted')
      .eq('id', this.integration.id)
      .single()

    if (!data?.credentials_encrypted) {
      return null
    }

    try {
      const credentials = JSON.parse(decrypt(data.credentials_encrypted))
      return credentials.api_key || null
    } catch {
      return null
    }
  }

  /**
   * Refresh OAuth tokens - to be implemented by OAuth-based clients
   */
  protected async refreshTokens(refreshToken: string): Promise<{ access_token: string }> {
    throw new Error('refreshTokens must be implemented by OAuth clients')
  }

  /**
   * Make an HTTP request with retry logic
   */
  protected async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retries = this.config.maxRetries,
      retryDelay = this.config.retryDelay,
    } = options

    const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseUrl}${endpoint}`

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...headers,
    }

    // Add authorization if available
    const authHeader = await this.getAuthorizationHeader()
    if (authHeader) {
      requestHeaders['Authorization'] = authHeader
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries!; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // Parse response
        let responseData: T | undefined
        const contentType = response.headers.get('content-type')

        if (contentType?.includes('application/json')) {
          responseData = await response.json()
        }

        if (!response.ok) {
          const errorMessage = this.extractErrorMessage(responseData) || response.statusText

          // Don't retry on client errors (4xx) except rate limits
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            return {
              success: false,
              error: {
                code: `HTTP_${response.status}`,
                message: errorMessage,
                details: responseData,
              },
            }
          }

          throw new Error(`HTTP ${response.status}: ${errorMessage}`)
        }

        return {
          success: true,
          data: responseData,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error('Request timeout')
        }

        // Log retry attempt
        if (attempt < retries!) {
          logIntegration(
            this.config.provider,
            'request',
            'warn',
            `Request failed, retrying (${attempt + 1}/${retries})`,
            { url, error: lastError.message }
          )
          await this.sleep(retryDelay! * (attempt + 1))
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: lastError?.message || 'Request failed after retries',
      },
    }
  }

  /**
   * Get the authorization header - to be implemented by subclasses
   */
  protected abstract getAuthorizationHeader(): Promise<string | null>

  /**
   * Extract error message from response data
   */
  protected extractErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null

    const obj = data as Record<string, unknown>

    // Common error message fields
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.error === 'string') return obj.error
    if (typeof obj.error_description === 'string') return obj.error_description
    if (obj.error && typeof obj.error === 'object') {
      const errorObj = obj.error as Record<string, unknown>
      if (typeof errorObj.message === 'string') return errorObj.message
    }

    return null
  }

  /**
   * Create a sync logger for an operation
   */
  protected createSyncLogger(
    operation: string,
    direction: SyncDirection,
    options: {
      relatedTable?: string
      relatedId?: string
      externalId?: string
      triggeredBy?: string
      triggerType?: TriggerType
    } = {}
  ): IntegrationSyncLogger {
    if (!this.integration) {
      throw new Error('Integration not loaded')
    }

    return new IntegrationSyncLogger({
      integrationId: this.integration.id,
      organizationId: this.organizationId,
      operation,
      direction,
      ...options,
    })
  }

  /**
   * Update the integration's sync status
   */
  protected async updateSyncStatus(
    status: 'success' | 'partial' | 'error',
    message?: string,
    errorMessage?: string
  ): Promise<void> {
    if (!this.integration) return
    await updateIntegrationSyncStatus(this.integration.id, status, message, errorMessage)
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get the provider name
   */
  getProvider(): IntegrationProvider {
    return this.config.provider
  }

  /**
   * Get the organization ID
   */
  getOrganizationId(): string {
    return this.organizationId
  }
}

/**
 * Base client for OAuth2 integrations
 */
export abstract class OAuthIntegrationClient extends BaseIntegrationClient {
  protected abstract getOAuthConfig(): {
    clientId: string
    clientSecret: string
    tokenUrl: string
  }

  protected async getAuthorizationHeader(): Promise<string | null> {
    const accessToken = await this.getAccessToken()
    if (!accessToken) return null
    return `Bearer ${accessToken}`
  }

  protected async refreshTokens(refreshToken: string): Promise<{ access_token: string }> {
    const config = this.getOAuthConfig()

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    const data = await response.json()
    const supabase = await createClient()

    // Update stored tokens
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null

    await supabase
      .from('organization_integrations')
      .update({
        access_token_encrypted: encrypt(data.access_token),
        refresh_token_encrypted: data.refresh_token ? encrypt(data.refresh_token) : undefined,
        token_expires_at: expiresAt?.toISOString(),
        status: 'connected',
      })
      .eq('id', this.integration!.id)

    return { access_token: data.access_token }
  }
}

/**
 * Base client for API key integrations
 */
export abstract class ApiKeyIntegrationClient extends BaseIntegrationClient {
  protected abstract getApiKeyHeader(): string

  protected async getAuthorizationHeader(): Promise<string | null> {
    const apiKey = await this.getApiKey()
    if (!apiKey) return null
    return `${this.getApiKeyHeader()} ${apiKey}`
  }
}
