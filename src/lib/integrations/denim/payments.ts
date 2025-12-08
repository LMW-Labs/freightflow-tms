import { createClient } from '@/lib/supabase/server'
import {
  createDenimClient,
  type CarrierPayment,
  type PaymentMethod,
  type PaymentStatus,
} from './client'
import { IntegrationSyncLogger, updateIntegrationSyncStatus } from '../core/logger'

interface PaymentResult {
  success: boolean
  message: string
  paymentId?: string
  amount?: number
  status?: PaymentStatus
  errors?: string[]
}

interface SyncResult {
  success: boolean
  message: string
  synced: number
  errors: number
}

/**
 * Create a carrier payment for a completed load
 */
export async function createCarrierPayment(
  loadId: string,
  organizationId: string,
  options?: {
    payment_method?: PaymentMethod
    use_quickpay?: boolean
    scheduled_date?: string
    triggeredBy?: string
  }
): Promise<PaymentResult> {
  const supabase = await createClient()

  // Get integration
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'denim')
    .eq('status', 'connected')
    .single()

  if (!integration) {
    return {
      success: false,
      message: 'Denim integration not connected',
    }
  }

  const logger = new IntegrationSyncLogger({
    integrationId: integration.id,
    organizationId,
    operation: 'create_carrier_payment',
    direction: 'push',
    relatedTable: 'loads',
    relatedId: loadId,
    triggeredBy: options?.triggeredBy,
    triggerType: options?.triggeredBy ? 'manual' : 'auto',
  })

  try {
    await logger.start()

    const client = await createDenimClient(organizationId)
    if (!client) {
      throw new Error('Failed to create Denim client')
    }

    // Get load with carrier info
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select(`
        *,
        carrier:carriers(id, company_name, mc_number, dot_number, email, phone, denim_carrier_id)
      `)
      .eq('id', loadId)
      .single()

    if (loadError || !load) {
      throw new Error(`Failed to fetch load: ${loadError?.message || 'Not found'}`)
    }

    if (!load.carrier) {
      throw new Error('No carrier assigned to this load')
    }

    if (!load.carrier_rate || load.carrier_rate <= 0) {
      throw new Error('Invalid carrier rate')
    }

    // Check if payment already exists
    if (load.denim_payment_id) {
      // Get existing payment status
      const existingResult = await client.getPayment(load.denim_payment_id)
      if (existingResult.success && existingResult.data) {
        return {
          success: true,
          message: 'Payment already exists for this load',
          paymentId: existingResult.data.id,
          amount: existingResult.data.amount,
          status: existingResult.data.status,
        }
      }
    }

    // Ensure carrier exists in Denim
    let denimCarrierId = load.carrier.denim_carrier_id

    if (!denimCarrierId) {
      // Create carrier in Denim
      const carrierResult = await client.upsertCarrier({
        external_id: load.carrier.id,
        name: load.carrier.company_name,
        mc_number: load.carrier.mc_number,
        dot_number: load.carrier.dot_number,
        email: load.carrier.email,
        phone: load.carrier.phone,
      })

      if (!carrierResult.success || !carrierResult.data) {
        throw new Error(`Failed to create carrier in Denim: ${carrierResult.error?.message}`)
      }

      denimCarrierId = carrierResult.data.id

      // Store Denim carrier ID
      await supabase
        .from('carriers')
        .update({ denim_carrier_id: denimCarrierId })
        .eq('id', load.carrier.id)
    }

    // Calculate QuickPay discount if requested
    let quickpayDiscount: number | undefined
    if (options?.use_quickpay) {
      const quickpayResult = await client.calculateQuickPay(load.carrier_rate, denimCarrierId)
      if (quickpayResult.success && quickpayResult.data) {
        quickpayDiscount = quickpayResult.data.discount_percent
      }
    }

    // Create payment
    const paymentResult = await client.createPayment({
      external_id: loadId,
      carrier_id: denimCarrierId,
      amount: load.carrier_rate,
      payment_method: options?.payment_method || 'ach',
      reference_number: load.reference_number,
      load_reference: load.reference_number,
      description: `Payment for Load ${load.reference_number}: ${load.origin_city}, ${load.origin_state} → ${load.dest_city}, ${load.dest_state}`,
      scheduled_date: options?.scheduled_date,
      quickpay_discount_percent: quickpayDiscount,
    })

    if (!paymentResult.success || !paymentResult.data) {
      throw new Error(`Failed to create payment: ${paymentResult.error?.message}`)
    }

    // Store Denim payment ID on load
    await supabase
      .from('loads')
      .update({
        denim_payment_id: paymentResult.data.id,
        carrier_payment_status: paymentResult.data.status,
      })
      .eq('id', loadId)

    await logger.success(
      {
        payment_id: paymentResult.data.id,
        amount: paymentResult.data.amount,
        net_amount: paymentResult.data.net_amount,
        status: paymentResult.data.status,
        quickpay_discount: quickpayDiscount,
      },
      paymentResult.data.id
    )

    await updateIntegrationSyncStatus(
      integration.id,
      'success',
      `Created payment for $${load.carrier_rate} to ${load.carrier.company_name}`
    )

    return {
      success: true,
      message: `Payment created for $${paymentResult.data.amount}`,
      paymentId: paymentResult.data.id,
      amount: paymentResult.data.amount,
      status: paymentResult.data.status,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('CREATE_PAYMENT_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integration.id, 'error', undefined, errorMsg)

    return {
      success: false,
      message: `Failed to create payment: ${errorMsg}`,
      errors: [errorMsg],
    }
  }
}

/**
 * Approve a pending payment
 */
export async function approveCarrierPayment(
  loadId: string,
  organizationId: string,
  triggeredBy?: string
): Promise<PaymentResult> {
  const supabase = await createClient()

  // Get load with Denim payment ID
  const { data: load } = await supabase
    .from('loads')
    .select('denim_payment_id, reference_number')
    .eq('id', loadId)
    .single()

  if (!load?.denim_payment_id) {
    return {
      success: false,
      message: 'No payment found for this load',
    }
  }

  const client = await createDenimClient(organizationId)
  if (!client) {
    return {
      success: false,
      message: 'Denim integration not connected',
    }
  }

  try {
    const result = await client.approvePayment(load.denim_payment_id)

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to approve payment')
    }

    // Update load with new status
    await supabase
      .from('loads')
      .update({ carrier_payment_status: result.data.status })
      .eq('id', loadId)

    return {
      success: true,
      message: `Payment approved for load ${load.reference_number}`,
      paymentId: result.data.id,
      status: result.data.status,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to approve payment: ${errorMsg}`,
      errors: [errorMsg],
    }
  }
}

/**
 * Cancel a pending payment
 */
export async function cancelCarrierPayment(
  loadId: string,
  organizationId: string,
  triggeredBy?: string
): Promise<PaymentResult> {
  const supabase = await createClient()

  // Get load with Denim payment ID
  const { data: load } = await supabase
    .from('loads')
    .select('denim_payment_id, reference_number')
    .eq('id', loadId)
    .single()

  if (!load?.denim_payment_id) {
    return {
      success: false,
      message: 'No payment found for this load',
    }
  }

  const client = await createDenimClient(organizationId)
  if (!client) {
    return {
      success: false,
      message: 'Denim integration not connected',
    }
  }

  try {
    const result = await client.cancelPayment(load.denim_payment_id)

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to cancel payment')
    }

    // Update load
    await supabase
      .from('loads')
      .update({
        carrier_payment_status: 'cancelled',
        denim_payment_id: null,
      })
      .eq('id', loadId)

    return {
      success: true,
      message: `Payment cancelled for load ${load.reference_number}`,
      paymentId: result.data.id,
      status: 'cancelled',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to cancel payment: ${errorMsg}`,
      errors: [errorMsg],
    }
  }
}

/**
 * Get payment status for a load
 */
export async function getPaymentStatus(
  loadId: string,
  organizationId: string
): Promise<{
  success: boolean
  payment?: CarrierPayment
  message: string
}> {
  const supabase = await createClient()

  // Get load with Denim payment ID
  const { data: load } = await supabase
    .from('loads')
    .select('denim_payment_id')
    .eq('id', loadId)
    .single()

  if (!load?.denim_payment_id) {
    return {
      success: false,
      message: 'No payment found for this load',
    }
  }

  const client = await createDenimClient(organizationId)
  if (!client) {
    return {
      success: false,
      message: 'Denim integration not connected',
    }
  }

  try {
    const result = await client.getPayment(load.denim_payment_id)

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get payment')
    }

    // Update load with current status
    await supabase
      .from('loads')
      .update({ carrier_payment_status: result.data.status })
      .eq('id', loadId)

    return {
      success: true,
      payment: result.data,
      message: `Payment status: ${result.data.status}`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to get payment status: ${errorMsg}`,
    }
  }
}

/**
 * Sync all carriers to Denim
 */
export async function syncCarriersToDenim(
  organizationId: string,
  triggeredBy?: string
): Promise<SyncResult> {
  const supabase = await createClient()

  // Get integration
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'denim')
    .eq('status', 'connected')
    .single()

  if (!integration) {
    return {
      success: false,
      message: 'Denim integration not connected',
      synced: 0,
      errors: 0,
    }
  }

  const logger = new IntegrationSyncLogger({
    integrationId: integration.id,
    organizationId,
    operation: 'sync_carriers_to_denim',
    direction: 'push',
    relatedTable: 'carriers',
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  let synced = 0
  let errors = 0

  try {
    await logger.start()

    const client = await createDenimClient(organizationId)
    if (!client) {
      throw new Error('Failed to create Denim client')
    }

    // Get all carriers without Denim ID
    const { data: carriers } = await supabase
      .from('carriers')
      .select('*')
      .eq('organization_id', organizationId)
      .is('denim_carrier_id', null)

    if (!carriers || carriers.length === 0) {
      await logger.success({ synced: 0, message: 'No carriers to sync' })
      return {
        success: true,
        message: 'No carriers to sync',
        synced: 0,
        errors: 0,
      }
    }

    for (const carrier of carriers) {
      try {
        const result = await client.upsertCarrier({
          external_id: carrier.id,
          name: carrier.company_name,
          mc_number: carrier.mc_number,
          dot_number: carrier.dot_number,
          email: carrier.email,
          phone: carrier.phone,
          address: carrier.address
            ? {
                street: carrier.address,
                city: carrier.city,
                state: carrier.state,
                postal_code: carrier.zip,
                country: 'US',
              }
            : undefined,
        })

        if (result.success && result.data) {
          await supabase
            .from('carriers')
            .update({ denim_carrier_id: result.data.id })
            .eq('id', carrier.id)
          synced++
        } else {
          errors++
        }
      } catch {
        errors++
      }
    }

    const success = errors === 0
    await logger.success({
      total_carriers: carriers.length,
      synced,
      errors,
    })

    await updateIntegrationSyncStatus(
      integration.id,
      success ? 'success' : 'partial',
      `Synced ${synced} carriers to Denim`
    )

    return {
      success,
      message: `Synced ${synced} of ${carriers.length} carriers`,
      synced,
      errors,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('SYNC_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integration.id, 'error', undefined, errorMsg)

    return {
      success: false,
      message: `Sync failed: ${errorMsg}`,
      synced,
      errors: errors + 1,
    }
  }
}

/**
 * Sync all pending payment statuses
 */
export async function syncPaymentStatuses(
  organizationId: string,
  triggeredBy?: string
): Promise<SyncResult> {
  const supabase = await createClient()

  // Get integration
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'denim')
    .eq('status', 'connected')
    .single()

  if (!integration) {
    return {
      success: false,
      message: 'Denim integration not connected',
      synced: 0,
      errors: 0,
    }
  }

  const logger = new IntegrationSyncLogger({
    integrationId: integration.id,
    organizationId,
    operation: 'sync_payment_statuses',
    direction: 'pull',
    relatedTable: 'loads',
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  let synced = 0
  let errors = 0

  try {
    await logger.start()

    const client = await createDenimClient(organizationId)
    if (!client) {
      throw new Error('Failed to create Denim client')
    }

    // Get all loads with pending payments
    const { data: loads } = await supabase
      .from('loads')
      .select('id, denim_payment_id')
      .eq('organization_id', organizationId)
      .not('denim_payment_id', 'is', null)
      .not('carrier_payment_status', 'in', '("paid","cancelled","failed")')

    if (!loads || loads.length === 0) {
      await logger.success({ synced: 0, message: 'No pending payments to sync' })
      return {
        success: true,
        message: 'No pending payments to sync',
        synced: 0,
        errors: 0,
      }
    }

    for (const load of loads) {
      try {
        const result = await client.getPayment(load.denim_payment_id!)

        if (result.success && result.data) {
          await supabase
            .from('loads')
            .update({
              carrier_payment_status: result.data.status,
              carrier_paid_date: result.data.paid_date,
            })
            .eq('id', load.id)
          synced++
        } else {
          errors++
        }
      } catch {
        errors++
      }
    }

    const success = errors === 0
    await logger.success({
      total_payments: loads.length,
      synced,
      errors,
    })

    await updateIntegrationSyncStatus(
      integration.id,
      success ? 'success' : 'partial',
      `Updated ${synced} payment statuses`
    )

    return {
      success,
      message: `Updated ${synced} of ${loads.length} payment statuses`,
      synced,
      errors,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('SYNC_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integration.id, 'error', undefined, errorMsg)

    return {
      success: false,
      message: `Sync failed: ${errorMsg}`,
      synced,
      errors: errors + 1,
    }
  }
}

/**
 * Get payment summary statistics
 */
export async function getPaymentSummary(
  organizationId: string
): Promise<{
  success: boolean
  summary?: {
    total_pending: number
    total_processing: number
    total_scheduled: number
    total_paid_mtd: number
    total_paid_ytd: number
    payment_count_mtd: number
    average_payment_mtd: number
  }
  message: string
}> {
  const client = await createDenimClient(organizationId)
  if (!client) {
    return {
      success: false,
      message: 'Denim integration not connected',
    }
  }

  try {
    const result = await client.getPaymentSummary()

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Failed to get summary')
    }

    return {
      success: true,
      summary: result.data,
      message: 'Summary retrieved successfully',
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to get summary: ${errorMsg}`,
    }
  }
}

/**
 * Create batch payments for multiple loads
 */
export async function createBatchPayments(
  loadIds: string[],
  organizationId: string,
  options?: {
    payment_method?: PaymentMethod
    use_quickpay?: boolean
    triggeredBy?: string
  }
): Promise<{
  success: boolean
  results: Array<{ loadId: string; success: boolean; message: string; paymentId?: string }>
  summary: { total: number; successful: number; failed: number }
}> {
  const results: Array<{ loadId: string; success: boolean; message: string; paymentId?: string }> = []

  for (const loadId of loadIds) {
    const result = await createCarrierPayment(loadId, organizationId, options)
    results.push({
      loadId,
      success: result.success,
      message: result.message,
      paymentId: result.paymentId,
    })
  }

  const successful = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length

  return {
    success: failed === 0,
    results,
    summary: {
      total: loadIds.length,
      successful,
      failed,
    },
  }
}
