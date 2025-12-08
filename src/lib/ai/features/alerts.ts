import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { Alert, AlertType, AlertSeverity } from '../core/types'

interface AlertCheckResult {
  alerts: Alert[]
  checksPerformed: number
}

// Check for no movement alerts
async function checkNoMovement(
  organizationId: string,
  hoursThreshold: number = 4
): Promise<Alert[]> {
  const supabase = await createSupabaseClient()
  const alerts: Alert[] = []

  const thresholdTime = new Date()
  thresholdTime.setHours(thresholdTime.getHours() - hoursThreshold)

  // Get active loads that should be moving
  const { data: loads } = await supabase
    .from('loads')
    .select('id, reference_number, carrier_id, origin_city, origin_state, dest_city, dest_state, last_location_update')
    .eq('organization_id', organizationId)
    .in('status', ['en_route_pickup', 'loaded', 'en_route_delivery'])
    .lt('last_location_update', thresholdTime.toISOString())

  for (const load of loads || []) {
    alerts.push({
      organization_id: organizationId,
      load_id: load.id,
      carrier_id: load.carrier_id,
      alert_type: 'no_movement',
      severity: hoursThreshold >= 6 ? 'critical' : 'warning',
      title: `No Movement - ${load.reference_number}`,
      message: `Load ${load.reference_number} (${load.origin_city}, ${load.origin_state} → ${load.dest_city}, ${load.dest_state}) has not reported movement in ${hoursThreshold}+ hours.`,
      metadata: {
        hours_since_update: hoursThreshold,
        last_update: load.last_location_update,
      },
    })
  }

  return alerts
}

// Check for pickup/delivery overdue
async function checkScheduleOverdue(
  organizationId: string
): Promise<Alert[]> {
  const supabase = await createSupabaseClient()
  const alerts: Alert[] = []
  const now = new Date()

  // Overdue pickups (still not picked up past pickup date)
  const { data: overduePickups } = await supabase
    .from('loads')
    .select('id, reference_number, carrier_id, origin_city, origin_state, pickup_date')
    .eq('organization_id', organizationId)
    .in('status', ['booked', 'dispatched', 'en_route_pickup'])
    .lt('pickup_date', now.toISOString().split('T')[0])

  for (const load of overduePickups || []) {
    const daysOverdue = Math.floor((now.getTime() - new Date(load.pickup_date).getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      organization_id: organizationId,
      load_id: load.id,
      carrier_id: load.carrier_id,
      alert_type: 'pickup_overdue',
      severity: daysOverdue >= 1 ? 'critical' : 'warning',
      title: `Pickup Overdue - ${load.reference_number}`,
      message: `Load ${load.reference_number} was scheduled for pickup on ${load.pickup_date} at ${load.origin_city}, ${load.origin_state}. Currently ${daysOverdue} day(s) overdue.`,
      metadata: {
        scheduled_date: load.pickup_date,
        days_overdue: daysOverdue,
      },
    })
  }

  // Overdue deliveries
  const { data: overdueDeliveries } = await supabase
    .from('loads')
    .select('id, reference_number, carrier_id, dest_city, dest_state, delivery_date')
    .eq('organization_id', organizationId)
    .in('status', ['loaded', 'en_route_delivery', 'at_delivery'])
    .lt('delivery_date', now.toISOString().split('T')[0])

  for (const load of overdueDeliveries || []) {
    const daysOverdue = Math.floor((now.getTime() - new Date(load.delivery_date).getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      organization_id: organizationId,
      load_id: load.id,
      carrier_id: load.carrier_id,
      alert_type: 'delivery_overdue',
      severity: 'critical',
      title: `Delivery Overdue - ${load.reference_number}`,
      message: `Load ${load.reference_number} was scheduled for delivery on ${load.delivery_date} at ${load.dest_city}, ${load.dest_state}. Currently ${daysOverdue} day(s) overdue.`,
      metadata: {
        scheduled_date: load.delivery_date,
        days_overdue: daysOverdue,
      },
    })
  }

  return alerts
}

// Check for expiring carrier insurance
async function checkInsuranceExpiring(
  organizationId: string,
  daysThreshold: number = 14
): Promise<Alert[]> {
  const supabase = await createSupabaseClient()
  const alerts: Alert[] = []

  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

  const { data: carriers } = await supabase
    .from('carriers')
    .select('id, company_name, insurance_expiry, liability_amount')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .lt('insurance_expiry', thresholdDate.toISOString().split('T')[0])
    .gt('insurance_expiry', new Date().toISOString().split('T')[0])

  for (const carrier of carriers || []) {
    const daysUntilExpiry = Math.floor((new Date(carrier.insurance_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    alerts.push({
      organization_id: organizationId,
      carrier_id: carrier.id,
      alert_type: 'insurance_expiring',
      severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
      title: `Insurance Expiring - ${carrier.company_name}`,
      message: `${carrier.company_name}'s insurance expires on ${carrier.insurance_expiry} (${daysUntilExpiry} days). Request updated certificate.`,
      metadata: {
        expiry_date: carrier.insurance_expiry,
        days_until_expiry: daysUntilExpiry,
        liability_amount: carrier.liability_amount,
      },
    })
  }

  // Also check for already expired insurance
  const { data: expiredCarriers } = await supabase
    .from('carriers')
    .select('id, company_name, insurance_expiry')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .lt('insurance_expiry', new Date().toISOString().split('T')[0])

  for (const carrier of expiredCarriers || []) {
    alerts.push({
      organization_id: organizationId,
      carrier_id: carrier.id,
      alert_type: 'insurance_expiring',
      severity: 'critical',
      title: `Insurance EXPIRED - ${carrier.company_name}`,
      message: `${carrier.company_name}'s insurance expired on ${carrier.insurance_expiry}. Do not dispatch loads until updated certificate received.`,
      metadata: {
        expiry_date: carrier.insurance_expiry,
        days_expired: Math.floor((new Date().getTime() - new Date(carrier.insurance_expiry).getTime()) / (1000 * 60 * 60 * 24)),
      },
    })
  }

  return alerts
}

// Check for aging invoices
async function checkInvoiceAging(
  organizationId: string,
  daysThreshold: number = 30
): Promise<Alert[]> {
  const supabase = await createSupabaseClient()
  const alerts: Alert[] = []

  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, due_date, customer_id, customer:customers(company_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'sent')
    .lt('due_date', thresholdDate.toISOString().split('T')[0])

  for (const invoice of invoices || []) {
    const daysOverdue = Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))
    const customerName = (invoice.customer as { company_name?: string })?.company_name || 'Unknown Customer'

    let severity: AlertSeverity = 'info'
    if (daysOverdue >= 60) severity = 'critical'
    else if (daysOverdue >= 30) severity = 'warning'

    alerts.push({
      organization_id: organizationId,
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      alert_type: 'invoice_aging',
      severity,
      title: `Invoice Overdue - ${invoice.invoice_number}`,
      message: `Invoice ${invoice.invoice_number} for ${customerName} ($${invoice.total_amount}) is ${daysOverdue} days past due.`,
      metadata: {
        invoice_number: invoice.invoice_number,
        amount: invoice.total_amount,
        due_date: invoice.due_date,
        days_overdue: daysOverdue,
        customer_name: customerName,
      },
    })
  }

  return alerts
}

// Check for missing documents on delivered loads
async function checkMissingDocuments(
  organizationId: string,
  hoursAfterDelivery: number = 48
): Promise<Alert[]> {
  const supabase = await createSupabaseClient()
  const alerts: Alert[] = []

  const thresholdTime = new Date()
  thresholdTime.setHours(thresholdTime.getHours() - hoursAfterDelivery)

  // Get delivered loads
  const { data: loads } = await supabase
    .from('loads')
    .select('id, reference_number, carrier_id, actual_delivery_date')
    .eq('organization_id', organizationId)
    .eq('status', 'delivered')
    .lt('actual_delivery_date', thresholdTime.toISOString())

  for (const load of loads || []) {
    // Check if POD exists
    const { count: podCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('load_id', load.id)
      .eq('document_type', 'pod')

    if (!podCount || podCount === 0) {
      alerts.push({
        organization_id: organizationId,
        load_id: load.id,
        carrier_id: load.carrier_id,
        alert_type: 'document_missing',
        severity: 'warning',
        title: `POD Missing - ${load.reference_number}`,
        message: `Load ${load.reference_number} was delivered ${hoursAfterDelivery}+ hours ago but no POD has been uploaded.`,
        metadata: {
          document_type: 'pod',
          delivery_date: load.actual_delivery_date,
        },
      })
    }
  }

  return alerts
}

// Main alert checker - runs all checks
export async function runAlertChecks(
  organizationId: string,
  options?: {
    noMovementHours?: number
    insuranceDays?: number
    invoiceAgingDays?: number
    missingDocHours?: number
  }
): Promise<AlertCheckResult> {
  const supabase = await createSupabaseClient()
  const allAlerts: Alert[] = []

  // Run all checks
  const [noMovement, scheduleOverdue, insuranceExpiring, invoiceAging, missingDocs] = await Promise.all([
    checkNoMovement(organizationId, options?.noMovementHours || 4),
    checkScheduleOverdue(organizationId),
    checkInsuranceExpiring(organizationId, options?.insuranceDays || 14),
    checkInvoiceAging(organizationId, options?.invoiceAgingDays || 30),
    checkMissingDocuments(organizationId, options?.missingDocHours || 48),
  ])

  allAlerts.push(...noMovement, ...scheduleOverdue, ...insuranceExpiring, ...invoiceAging, ...missingDocs)

  // Deduplicate - don't create alerts that already exist (same type + entity)
  const existingAlerts = await supabase
    .from('alerts')
    .select('alert_type, load_id, carrier_id, customer_id, invoice_id')
    .eq('organization_id', organizationId)
    .eq('is_dismissed', false)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

  const existingKeys = new Set(
    (existingAlerts.data || []).map(a =>
      `${a.alert_type}-${a.load_id || ''}-${a.carrier_id || ''}-${a.customer_id || ''}-${a.invoice_id || ''}`
    )
  )

  const newAlerts = allAlerts.filter(alert => {
    const key = `${alert.alert_type}-${alert.load_id || ''}-${alert.carrier_id || ''}-${alert.customer_id || ''}-${alert.invoice_id || ''}`
    return !existingKeys.has(key)
  })

  // Insert new alerts
  if (newAlerts.length > 0) {
    await supabase.from('alerts').insert(newAlerts)
  }

  return {
    alerts: newAlerts,
    checksPerformed: 5,
  }
}

// Get active alerts for organization
export async function getActiveAlerts(
  organizationId: string,
  options?: {
    severity?: AlertSeverity
    alertType?: AlertType
    limit?: number
  }
): Promise<Alert[]> {
  const supabase = await createSupabaseClient()

  let query = supabase
    .from('alerts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_dismissed', false)
    .or('snoozed_until.is.null,snoozed_until.lt.' + new Date().toISOString())
    .order('severity', { ascending: true }) // critical first
    .order('created_at', { ascending: false })

  if (options?.severity) {
    query = query.eq('severity', options.severity)
  }

  if (options?.alertType) {
    query = query.eq('alert_type', options.alertType)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data } = await query

  return data || []
}

// Dismiss alert
export async function dismissAlert(
  alertId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from('alerts')
    .update({
      is_dismissed: true,
      dismissed_by: userId,
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', alertId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Snooze alert
export async function snoozeAlert(
  alertId: string,
  snoozeHours: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseClient()

  const snoozeUntil = new Date()
  snoozeUntil.setHours(snoozeUntil.getHours() + snoozeHours)

  const { error } = await supabase
    .from('alerts')
    .update({
      snoozed_until: snoozeUntil.toISOString(),
    })
    .eq('id', alertId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Mark alert as read
export async function markAlertRead(
  alertId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', alertId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Get alert counts by severity
export async function getAlertCounts(
  organizationId: string
): Promise<{ critical: number; warning: number; info: number; total: number }> {
  const supabase = await createSupabaseClient()

  const { data } = await supabase
    .from('alerts')
    .select('severity')
    .eq('organization_id', organizationId)
    .eq('is_dismissed', false)
    .or('snoozed_until.is.null,snoozed_until.lt.' + new Date().toISOString())

  const counts = { critical: 0, warning: 0, info: 0, total: 0 }

  for (const alert of data || []) {
    counts[alert.severity as AlertSeverity]++
    counts.total++
  }

  return counts
}
