import { createClient } from '@/lib/supabase/server'
import type { SyncDirection, TriggerType } from './types'

export interface SyncLogParams {
  integrationId: string
  organizationId: string
  operation: string
  direction: SyncDirection
  relatedTable?: string
  relatedId?: string
  externalId?: string
  triggeredBy?: string
  triggerType?: TriggerType
}

export interface SyncLogUpdate {
  status: 'running' | 'success' | 'error'
  requestSummary?: Record<string, unknown>
  responseSummary?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
  externalId?: string
}

/**
 * Logger for integration sync operations
 * Creates and updates sync log entries in the database
 */
export class IntegrationSyncLogger {
  private logId: string | null = null
  private startTime: number

  constructor(private params: SyncLogParams) {
    this.startTime = Date.now()
  }

  /**
   * Start a new sync log entry
   */
  async start(): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('integration_sync_logs')
      .insert({
        integration_id: this.params.integrationId,
        organization_id: this.params.organizationId,
        operation: this.params.operation,
        direction: this.params.direction,
        status: 'running',
        related_table: this.params.relatedTable,
        related_id: this.params.relatedId,
        external_id: this.params.externalId,
        triggered_by: this.params.triggeredBy,
        trigger_type: this.params.triggerType || 'auto',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      console.error('Failed to create sync log:', error)
      throw error || new Error('No log ID returned')
    }

    this.logId = data.id
    return data.id
  }

  /**
   * Update the sync log with progress or completion
   */
  async update(update: SyncLogUpdate): Promise<void> {
    if (!this.logId) {
      console.warn('Cannot update sync log: not started')
      return
    }

    const supabase = await createClient()
    const durationMs = Date.now() - this.startTime

    const updateData: Record<string, unknown> = {
      status: update.status,
      duration_ms: durationMs,
    }

    if (update.requestSummary) {
      updateData.request_summary = update.requestSummary
    }

    if (update.responseSummary) {
      updateData.response_summary = update.responseSummary
    }

    if (update.status === 'success' || update.status === 'error') {
      updateData.completed_at = new Date().toISOString()
    }

    if (update.errorCode) {
      updateData.error_code = update.errorCode
    }

    if (update.errorMessage) {
      updateData.error_message = update.errorMessage
    }

    if (update.externalId) {
      updateData.external_id = update.externalId
    }

    const { error } = await supabase
      .from('integration_sync_logs')
      .update(updateData)
      .eq('id', this.logId)

    if (error) {
      console.error('Failed to update sync log:', error)
    }
  }

  /**
   * Mark the sync as successful
   */
  async success(
    responseSummary?: Record<string, unknown>,
    externalId?: string
  ): Promise<void> {
    await this.update({
      status: 'success',
      responseSummary,
      externalId,
    })
  }

  /**
   * Mark the sync as failed
   */
  async error(
    errorCode: string,
    errorMessage: string,
    responseSummary?: Record<string, unknown>
  ): Promise<void> {
    await this.update({
      status: 'error',
      errorCode,
      errorMessage,
      responseSummary,
    })
  }

  /**
   * Get the log ID
   */
  getLogId(): string | null {
    return this.logId
  }
}

/**
 * Update the integration record with sync status
 */
export async function updateIntegrationSyncStatus(
  integrationId: string,
  status: 'success' | 'partial' | 'error',
  message?: string,
  errorMessage?: string
): Promise<void> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {
    last_sync_at: new Date().toISOString(),
    last_sync_status: status,
    last_sync_message: message,
  }

  if (status === 'error') {
    updateData.last_error = errorMessage
    updateData.last_error_at = new Date().toISOString()
    // Increment error count
    const { data: current } = await supabase
      .from('organization_integrations')
      .select('error_count')
      .eq('id', integrationId)
      .single()

    updateData.error_count = (current?.error_count || 0) + 1
  } else {
    // Reset error count on success
    updateData.error_count = 0
    updateData.last_error = null
    updateData.last_error_at = null
  }

  const { error } = await supabase
    .from('organization_integrations')
    .update(updateData)
    .eq('id', integrationId)

  if (error) {
    console.error('Failed to update integration sync status:', error)
  }
}

/**
 * Log a simple message without creating a full sync log
 */
export function logIntegration(
  provider: string,
  operation: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>
): void {
  const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  const prefix = `[Integration:${provider}:${operation}]`

  if (data) {
    logFn(prefix, message, data)
  } else {
    logFn(prefix, message)
  }
}
