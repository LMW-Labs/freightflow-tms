import { createClient } from '@/lib/supabase/server'
import { QuickBooksClient, createQuickBooksClient } from './client'
import { IntegrationSyncLogger, updateIntegrationSyncStatus } from '../core/logger'

interface SyncResult {
  success: boolean
  message: string
  itemsProcessed: number
  errors?: string[]
}

/**
 * Sync customers from VectrLoadAI to QuickBooks
 */
export async function syncCustomersToQuickBooks(
  integrationId: string,
  organizationId: string,
  triggeredBy?: string
): Promise<SyncResult> {
  const logger = new IntegrationSyncLogger({
    integrationId,
    organizationId,
    operation: 'sync_customers_to_qbo',
    direction: 'push',
    relatedTable: 'customers',
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  const errors: string[] = []
  let itemsProcessed = 0

  try {
    await logger.start()

    const client = await createQuickBooksClient(organizationId)
    if (!client) {
      throw new Error('Failed to create QuickBooks client')
    }

    const supabase = await createClient()

    // Get all customers that need syncing
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)

    if (fetchError) {
      throw new Error(`Failed to fetch customers: ${fetchError.message}`)
    }

    for (const customer of customers || []) {
      try {
        // Check if customer already exists in QBO by name
        const existingResult = await client.findCustomerByName(customer.company_name)

        if (existingResult.success && existingResult.data) {
          // Customer exists, update if needed
          // For now, skip updating to avoid conflicts
          itemsProcessed++
          continue
        }

        // Create new customer in QBO
        const createResult = await client.createCustomer({
          DisplayName: customer.company_name,
          CompanyName: customer.company_name,
          PrimaryEmailAddr: customer.email
            ? { Address: customer.email }
            : undefined,
          PrimaryPhone: customer.phone
            ? { FreeFormNumber: customer.phone }
            : undefined,
          BillAddr: customer.billing_address
            ? {
                Line1: customer.billing_address,
                City: customer.billing_city,
                CountrySubDivisionCode: customer.billing_state,
                PostalCode: customer.billing_zip,
              }
            : undefined,
          Active: true,
        })

        if (createResult.success && createResult.data) {
          // Store QBO customer ID for future reference
          await supabase
            .from('customers')
            .update({ qbo_customer_id: createResult.data.Id })
            .eq('id', customer.id)

          itemsProcessed++
        } else {
          errors.push(`Failed to create customer ${customer.company_name}: ${createResult.error}`)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`Error processing customer ${customer.company_name}: ${errorMsg}`)
      }
    }

    const success = errors.length === 0
    await logger.success({
      items_processed: itemsProcessed,
      total_customers: customers?.length || 0,
      errors: errors.length,
    })

    await updateIntegrationSyncStatus(
      integrationId,
      success ? 'success' : 'partial',
      `Synced ${itemsProcessed} customers to QuickBooks`,
      errors.length > 0 ? errors.join('; ') : undefined
    )

    return {
      success,
      message: `Synced ${itemsProcessed} customers to QuickBooks`,
      itemsProcessed,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('SYNC_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integrationId, 'error', undefined, errorMsg)

    return {
      success: false,
      message: `Customer sync failed: ${errorMsg}`,
      itemsProcessed,
      errors: [errorMsg],
    }
  }
}

/**
 * Push an invoice from VectrLoadAI to QuickBooks
 */
export async function pushInvoiceToQuickBooks(
  integrationId: string,
  organizationId: string,
  invoiceId: string,
  triggeredBy?: string
): Promise<SyncResult> {
  const logger = new IntegrationSyncLogger({
    integrationId,
    organizationId,
    operation: 'push_invoice_to_qbo',
    direction: 'push',
    relatedTable: 'invoices',
    relatedId: invoiceId,
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  try {
    await logger.start()

    const client = await createQuickBooksClient(organizationId)
    if (!client) {
      throw new Error('Failed to create QuickBooks client')
    }

    const supabase = await createClient()

    // Get the invoice with related data
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(id, company_name, qbo_customer_id),
        load:loads(reference_number, origin_city, origin_state, dest_city, dest_state)
      `)
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      throw new Error(`Failed to fetch invoice: ${fetchError?.message || 'Not found'}`)
    }

    // Get or create the customer in QBO
    let qboCustomerId = invoice.customer?.qbo_customer_id

    if (!qboCustomerId) {
      // Try to find or create the customer
      const existingResult = await client.findCustomerByName(invoice.customer?.company_name)

      if (existingResult.success && existingResult.data) {
        qboCustomerId = existingResult.data.Id

        // Update our record with the QBO ID
        await supabase
          .from('customers')
          .update({ qbo_customer_id: qboCustomerId })
          .eq('id', invoice.customer?.id)
      } else {
        // Create the customer
        const createResult = await client.createCustomer({
          DisplayName: invoice.customer?.company_name || 'Unknown Customer',
          CompanyName: invoice.customer?.company_name,
        })

        if (createResult.success && createResult.data) {
          qboCustomerId = createResult.data.Id

          await supabase
            .from('customers')
            .update({ qbo_customer_id: qboCustomerId })
            .eq('id', invoice.customer?.id)
        } else {
          throw new Error(`Failed to create customer in QBO: ${createResult.error}`)
        }
      }
    }

    // Build the invoice description
    const loadInfo = invoice.load
      ? `Load ${invoice.load.reference_number}: ${invoice.load.origin_city}, ${invoice.load.origin_state} → ${invoice.load.dest_city}, ${invoice.load.dest_state}`
      : `Invoice ${invoice.invoice_number}`

    // Get a service item for the line item (or use default "Services" item)
    const itemsResult = await client.queryItems()
    const serviceItem = itemsResult.data?.[0] || { Id: '1', Name: 'Services' }

    // Create the invoice in QBO
    const createResult = await client.createInvoice({
      CustomerRef: { value: qboCustomerId! },
      DocNumber: invoice.invoice_number,
      TxnDate: invoice.invoice_date,
      DueDate: invoice.due_date,
      Line: [
        {
          Amount: invoice.total,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: serviceItem.Id, name: serviceItem.Name },
            UnitPrice: invoice.total,
            Qty: 1,
          },
          Description: loadInfo,
        },
      ],
      PrivateNote: `VectrLoadAI Invoice: ${invoice.invoice_number}`,
    })

    if (!createResult.success || !createResult.data) {
      throw new Error(`Failed to create invoice in QBO: ${createResult.error}`)
    }

    // Update our invoice with the QBO ID
    await supabase
      .from('invoices')
      .update({ qbo_invoice_id: createResult.data.Id })
      .eq('id', invoiceId)

    await logger.success(
      {
        qbo_invoice_id: createResult.data.Id,
        qbo_doc_number: createResult.data.DocNumber,
        total: createResult.data.TotalAmt,
      },
      createResult.data.Id
    )

    await updateIntegrationSyncStatus(
      integrationId,
      'success',
      `Invoice ${invoice.invoice_number} pushed to QuickBooks`
    )

    return {
      success: true,
      message: `Invoice ${invoice.invoice_number} pushed to QuickBooks`,
      itemsProcessed: 1,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('PUSH_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integrationId, 'error', undefined, errorMsg)

    return {
      success: false,
      message: `Invoice push failed: ${errorMsg}`,
      itemsProcessed: 0,
      errors: [errorMsg],
    }
  }
}

/**
 * Push a carrier payment as a bill to QuickBooks
 */
export async function pushCarrierBillToQuickBooks(
  integrationId: string,
  organizationId: string,
  loadId: string,
  carrierId: string,
  amount: number,
  triggeredBy?: string
): Promise<SyncResult> {
  const logger = new IntegrationSyncLogger({
    integrationId,
    organizationId,
    operation: 'push_carrier_bill_to_qbo',
    direction: 'push',
    relatedTable: 'loads',
    relatedId: loadId,
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  try {
    await logger.start()

    const client = await createQuickBooksClient(organizationId)
    if (!client) {
      throw new Error('Failed to create QuickBooks client')
    }

    const supabase = await createClient()

    // Get load and carrier info
    const { data: load } = await supabase
      .from('loads')
      .select('reference_number, origin_city, origin_state, dest_city, dest_state')
      .eq('id', loadId)
      .single()

    const { data: carrier } = await supabase
      .from('carriers')
      .select('id, company_name, qbo_vendor_id')
      .eq('id', carrierId)
      .single()

    if (!carrier) {
      throw new Error('Carrier not found')
    }

    // Get or create vendor in QBO
    let qboVendorId = carrier.qbo_vendor_id

    if (!qboVendorId) {
      // Try to find by name or create
      const vendorsResult = await client.queryVendors()
      const existingVendor = vendorsResult.data?.find(
        (v) => v.DisplayName.toLowerCase() === carrier.company_name.toLowerCase()
      )

      if (existingVendor) {
        qboVendorId = existingVendor.Id
      } else {
        const createResult = await client.createVendor({
          DisplayName: carrier.company_name,
          CompanyName: carrier.company_name,
        })

        if (createResult.success && createResult.data) {
          qboVendorId = createResult.data.Id
        } else {
          throw new Error(`Failed to create vendor: ${createResult.error}`)
        }
      }

      // Update our carrier record
      await supabase
        .from('carriers')
        .update({ qbo_vendor_id: qboVendorId })
        .eq('id', carrierId)
    }

    // Get expense account (or use default)
    const accountsResult = await client.queryExpenseAccounts()
    const freightAccount =
      accountsResult.data?.find((a) =>
        a.Name.toLowerCase().includes('freight')
      ) ||
      accountsResult.data?.find((a) =>
        a.Name.toLowerCase().includes('cost of goods')
      ) ||
      accountsResult.data?.[0]

    if (!freightAccount) {
      throw new Error('No expense account found in QuickBooks')
    }

    const description = load
      ? `Load ${load.reference_number}: ${load.origin_city}, ${load.origin_state} → ${load.dest_city}, ${load.dest_state}`
      : `Carrier payment`

    // Create the bill
    const createResult = await client.createBill({
      VendorRef: { value: qboVendorId! },
      TxnDate: new Date().toISOString().split('T')[0],
      Line: [
        {
          Amount: amount,
          DetailType: 'AccountBasedExpenseLineDetail',
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: freightAccount.Id, name: freightAccount.Name },
          },
          Description: description,
        },
      ],
      PrivateNote: `VectrLoadAI Load: ${load?.reference_number || loadId}`,
    })

    if (!createResult.success || !createResult.data) {
      throw new Error(`Failed to create bill: ${createResult.error}`)
    }

    await logger.success(
      {
        qbo_bill_id: createResult.data.Id,
        amount,
        vendor_id: qboVendorId,
      },
      createResult.data.Id
    )

    await updateIntegrationSyncStatus(
      integrationId,
      'success',
      `Carrier bill for $${amount} pushed to QuickBooks`
    )

    return {
      success: true,
      message: `Carrier bill for $${amount} pushed to QuickBooks`,
      itemsProcessed: 1,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('PUSH_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integrationId, 'error', undefined, errorMsg)

    return {
      success: false,
      message: `Carrier bill push failed: ${errorMsg}`,
      itemsProcessed: 0,
      errors: [errorMsg],
    }
  }
}
