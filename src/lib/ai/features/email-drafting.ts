import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { structuredCompletion } from '../core/client'
import { buildEmailDraftPrompt } from '../core/prompts'
import { EmailTemplateType, EmailDraftRequest, EmailDraftResponse } from '../core/types'

interface EmailDraftResult {
  success: boolean
  draft?: EmailDraftResponse
  draftId?: string
  error?: string
}

// Get context data for email generation
async function getEmailContext(
  request: EmailDraftRequest,
  organizationId: string
) {
  const supabase = await createSupabaseClient()
  const context: {
    loadDetails?: Record<string, unknown>
    carrierDetails?: Record<string, unknown>
    customerDetails?: Record<string, unknown>
    invoiceDetails?: Record<string, unknown>
    organizationDetails?: Record<string, unknown>
  } = {}

  // Get organization details for branding
  const { data: org } = await supabase
    .from('organizations')
    .select('name, email, phone')
    .eq('id', organizationId)
    .single()

  if (org) {
    context.organizationDetails = org
  }

  // Get load details
  if (request.context.load_id) {
    const { data: load } = await supabase
      .from('loads')
      .select(`
        *,
        carrier:carriers(company_name, contact_name, contact_email, contact_phone),
        customer:customers(company_name, contact_name, contact_email)
      `)
      .eq('id', request.context.load_id)
      .single()

    if (load) {
      context.loadDetails = {
        reference_number: load.reference_number,
        origin: `${load.origin_city}, ${load.origin_state}`,
        destination: `${load.dest_city}, ${load.dest_state}`,
        pickup_date: load.pickup_date,
        delivery_date: load.delivery_date,
        equipment_type: load.equipment_type,
        weight: load.weight,
        customer_rate: load.customer_rate,
        carrier_rate: load.carrier_rate,
        status: load.status,
        special_instructions: load.special_instructions,
        carrier: load.carrier,
        customer: load.customer,
      }
    }
  }

  // Get carrier details
  if (request.context.carrier_id) {
    const { data: carrier } = await supabase
      .from('carriers')
      .select('company_name, contact_name, contact_email, contact_phone, mc_number')
      .eq('id', request.context.carrier_id)
      .single()

    if (carrier) {
      context.carrierDetails = carrier
    }
  }

  // Get customer details
  if (request.context.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('company_name, contact_name, contact_email, billing_email, phone')
      .eq('id', request.context.customer_id)
      .single()

    if (customer) {
      context.customerDetails = customer
    }
  }

  // Get invoice details
  if (request.context.invoice_id) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(company_name, contact_name, billing_email)
      `)
      .eq('id', request.context.invoice_id)
      .single()

    if (invoice) {
      context.invoiceDetails = {
        invoice_number: invoice.invoice_number,
        amount: invoice.total_amount,
        due_date: invoice.due_date,
        status: invoice.status,
        customer: invoice.customer,
      }
    }
  }

  return context
}

// Determine recipient email based on template type
function getRecipientEmail(
  templateType: EmailTemplateType,
  context: Record<string, unknown>
): string {
  switch (templateType) {
    case 'rate_con':
    case 'dispatch':
    case 'pod_request':
    case 'carrier_follow_up':
      // Carrier emails
      const carrierDetails = context.carrierDetails as Record<string, unknown> | undefined
      const loadCarrier = (context.loadDetails as Record<string, unknown> | undefined)?.carrier as Record<string, unknown> | undefined
      return (carrierDetails?.contact_email ||
        loadCarrier?.contact_email ||
        '') as string

    case 'invoice':
    case 'payment_reminder':
    case 'load_confirmation':
    case 'customer_update':
      // Customer emails
      const customerDetails = context.customerDetails as Record<string, unknown> | undefined
      const invoiceCustomer = (context.invoiceDetails as Record<string, unknown> | undefined)?.customer as Record<string, unknown> | undefined
      const loadCustomer = (context.loadDetails as Record<string, unknown> | undefined)?.customer as Record<string, unknown> | undefined
      return (customerDetails?.billing_email ||
        customerDetails?.contact_email ||
        invoiceCustomer?.billing_email ||
        loadCustomer?.contact_email ||
        '') as string

    default:
      return ''
  }
}

// Main email drafting function
export async function generateEmailDraft(
  request: EmailDraftRequest,
  organizationId: string,
  userId: string
): Promise<EmailDraftResult> {
  const supabase = await createSupabaseClient()

  try {
    // 1. Get context data
    const context = await getEmailContext(request, organizationId)

    // 2. Build prompt
    const prompt = buildEmailDraftPrompt(context, request.tone || 'professional')

    // 3. Build user message
    const templateDescriptions: Record<EmailTemplateType, string> = {
      rate_con: 'Generate a rate confirmation email to send to the carrier confirming the load details and rate.',
      dispatch: 'Generate dispatch instructions email with pickup/delivery details for the driver.',
      invoice: 'Generate an invoice email to send to the customer with payment instructions.',
      payment_reminder: 'Generate a friendly but firm payment reminder for an overdue invoice.',
      load_confirmation: 'Generate a load confirmation email to the customer confirming their shipment is booked.',
      pod_request: 'Generate an email requesting proof of delivery documents from the carrier.',
      carrier_follow_up: 'Generate a follow-up email to check on load status with the carrier.',
      customer_update: 'Generate a status update email for the customer about their shipment.',
    }

    const userMessage = `${templateDescriptions[request.template_type]}

${request.context.additional_context ? `Additional context: ${request.context.additional_context}` : ''}

Generate the email with subject, HTML body, and plain text body. Return as JSON.`

    // 4. Get AI draft
    const response = await structuredCompletion<EmailDraftResponse>({
      feature: 'email_drafting',
      organizationId,
      userId,
      systemPrompt: prompt,
      userMessage,
    })

    if (!response.success || !response.data) {
      return { success: false, error: response.error }
    }

    const draft = response.data

    // Fill in recipient if not provided by AI
    if (!draft.to_email) {
      draft.to_email = getRecipientEmail(request.template_type, context)
    }

    // 5. Save draft to database
    const { data: savedDraft } = await supabase
      .from('ai_email_drafts')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        load_id: request.context.load_id,
        carrier_id: request.context.carrier_id,
        customer_id: request.context.customer_id,
        invoice_id: request.context.invoice_id,
        template_type: request.template_type,
        context_data: context,
        to_email: draft.to_email,
        subject: draft.subject,
        body_html: draft.body_html,
        body_text: draft.body_text,
        attachments: draft.suggested_attachments ? draft.suggested_attachments.map(a => ({ name: a })) : [],
        status: 'draft',
      })
      .select('id')
      .single()

    return {
      success: true,
      draft,
      draftId: savedDraft?.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

// Update draft
export async function updateEmailDraft(
  draftId: string,
  updates: Partial<EmailDraftResponse>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from('ai_email_drafts')
    .update({
      to_email: updates.to_email,
      subject: updates.subject,
      body_html: updates.body_html,
      body_text: updates.body_text,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draftId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Mark draft as sent
export async function markDraftSent(
  draftId: string,
  sentVia: 'resend' | 'copied' | 'external'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseClient()

  const { error } = await supabase
    .from('ai_email_drafts')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_via: sentVia,
    })
    .eq('id', draftId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Get draft by ID
export async function getEmailDraft(draftId: string) {
  const supabase = await createSupabaseClient()

  const { data, error } = await supabase
    .from('ai_email_drafts')
    .select('*')
    .eq('id', draftId)
    .single()

  if (error) {
    return null
  }

  return data
}

// Get user's recent drafts
export async function getRecentDrafts(
  userId: string,
  limit: number = 10
) {
  const supabase = await createSupabaseClient()

  const { data } = await supabase
    .from('ai_email_drafts')
    .select('id, template_type, to_email, subject, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
