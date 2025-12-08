import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

// Lazy initialization of Resend client
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(apiKey)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { invoiceId, email, sendToType, documentUrls } = body

    if (!invoiceId || !email) {
      return NextResponse.json({ error: 'Invoice ID and email are required' }, { status: 400 })
    }

    // Fetch invoice details
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        load:loads(reference_number, origin_city, origin_state, dest_city, dest_state),
        customer:customers(company_name),
        carrier:carriers(company_name)
      `)
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Fetch organization for branding
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    const { data: organization } = await supabase
      .from('organizations')
      .select('name, email, phone, logo_url')
      .eq('id', userData?.organization_id)
      .single()

    // Build email content
    const companyName = invoice.invoice_type === 'customer'
      ? invoice.customer?.company_name
      : invoice.carrier?.company_name

    const subject = `Invoice ${invoice.invoice_number} from ${organization?.name || 'FreightFlow'}`

    const loadInfo = invoice.load
      ? `Load: ${invoice.load.reference_number} (${invoice.load.origin_city}, ${invoice.load.origin_state} → ${invoice.load.dest_city}, ${invoice.load.dest_state})`
      : ''

    // Create HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #e5e7eb; }
          .content { padding: 30px 0; }
          .invoice-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 24px; font-weight: bold; color: #1d4ed8; }
          .footer { padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .docs-list { margin: 20px 0; }
          .doc-item { padding: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${organization?.name || 'FreightFlow'}</h1>
          </div>

          <div class="content">
            <p>Dear ${companyName},</p>

            <p>Please find attached Invoice <strong>${invoice.invoice_number}</strong> for your records.</p>

            <div class="invoice-box">
              <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
              ${loadInfo ? `<p><strong>${loadInfo}</strong></p>` : ''}
              <p class="amount">Total: $${invoice.total.toLocaleString()}</p>
            </div>

            ${documentUrls && documentUrls.length > 0 ? `
              <div class="docs-list">
                <p><strong>Attached Documents:</strong></p>
                ${documentUrls.map((url: string, i: number) => `
                  <div class="doc-item">
                    <a href="${url}">Document ${i + 1}</a>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

            <p>Thank you for your business!</p>
          </div>

          <div class="footer">
            <p>${organization?.name || 'FreightFlow'}</p>
            ${organization?.email ? `<p>Email: ${organization.email}</p>` : ''}
            ${organization?.phone ? `<p>Phone: ${organization.phone}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `

    // Send email via Resend
    const resend = getResendClient()
    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'invoices@freightflow.app',
      to: email,
      subject,
      html: htmlContent,
    })

    if (emailError) {
      console.error('Error sending email:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in send invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
