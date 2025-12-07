import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { format } from 'date-fns'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Broker info from env
const BROKER_INFO = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'FreightFlow',
  address: process.env.NEXT_PUBLIC_BROKER_ADDRESS || '',
  city_state_zip: process.env.NEXT_PUBLIC_BROKER_CITY_STATE_ZIP || '',
  mc: process.env.NEXT_PUBLIC_BROKER_MC || '',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
  fax: process.env.NEXT_PUBLIC_BROKER_FAX || '',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || '',
}

// Replace template variables with actual data
function replaceVariables(template: string, data: Record<string, string | null | undefined>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (match, key) => {
    const value = data[key]
    return value !== null && value !== undefined ? String(value) : ''
  })
}

// Format currency
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Format date
function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return format(new Date(value), 'MM/dd/yyyy')
  } catch {
    return value
  }
}

// Format time window
function formatTimeWindow(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return ''
  if (!end) return start
  return `${start} - ${end}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { load_id, template_id, template_type = 'rate_confirmation' } = body

    if (!load_id) {
      return NextResponse.json({ error: 'Load ID required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Fetch load with related data
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select(`
        *,
        carrier:carriers(*),
        customer:customers(*),
        driver:drivers(*)
      `)
      .eq('id', load_id)
      .single()

    if (loadError || !load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 })
    }

    // Fetch template
    let template = null
    if (template_id) {
      const { data } = await supabase
        .from('document_templates')
        .select('*')
        .eq('id', template_id)
        .single()
      template = data
    } else {
      // Get default template for type
      const { data } = await supabase
        .from('document_templates')
        .select('*')
        .eq('type', template_type)
        .eq('is_default', true)
        .single()
      template = data
    }

    if (!template) {
      return NextResponse.json(
        { error: 'No template found. Please create a template first.' },
        { status: 404 }
      )
    }

    // Build variable data
    const variableData: Record<string, string> = {
      // Load info
      reference_number: load.reference_number || '',
      pro_number: load.pro_number || '',
      po_number: load.po_number || '',
      bol_number: load.bol_number || '',
      status: load.status || '',
      load_type: load.load_type || '',
      booked_date: formatDate(load.booked_date),

      // Freight
      commodity: load.commodity || '',
      weight: load.weight ? `${Number(load.weight).toLocaleString()}` : '',
      equipment_type: load.equipment_type || '',
      equipment_code: load.equipment_code || '',
      special_instructions: load.special_instructions || '',

      // Pickup
      pickup_name: load.pickup_name || '',
      origin_address: load.origin_address || '',
      origin_city: load.origin_city || '',
      origin_state: load.origin_state || '',
      pickup_city_state: [load.origin_city, load.origin_state].filter(Boolean).join(', '),
      pickup_full_address: [load.origin_address, load.origin_city, load.origin_state].filter(Boolean).join(', '),
      pickup_date: formatDate(load.pickup_date),
      pickup_time: formatTimeWindow(load.pickup_time_start, load.pickup_time_end),
      pickup_contact: load.pickup_contact || '',
      pickup_phone: load.pickup_phone || '',
      pickup_notes: load.pickup_notes || '',

      // Delivery
      delivery_name: load.delivery_name || '',
      dest_address: load.dest_address || '',
      dest_city: load.dest_city || '',
      dest_state: load.dest_state || '',
      delivery_city_state: [load.dest_city, load.dest_state].filter(Boolean).join(', '),
      delivery_full_address: [load.dest_address, load.dest_city, load.dest_state].filter(Boolean).join(', '),
      delivery_date: formatDate(load.delivery_date),
      delivery_time: formatTimeWindow(load.delivery_time_start, load.delivery_time_end),
      delivery_contact: load.delivery_contact || '',
      delivery_phone: load.delivery_phone || '',
      delivery_notes: load.delivery_notes || '',

      // Rates
      customer_rate: formatCurrency(load.customer_rate),
      carrier_rate: formatCurrency(load.carrier_rate),
      margin: formatCurrency((load.customer_rate || 0) - (load.carrier_rate || 0)),
      pay_terms: load.pay_terms || 'Net 30',
      freight_terms: load.freight_terms || 'PREPAID',

      // Customer
      'customer.company_name': load.customer?.company_name || '',
      'customer.contact_name': load.customer?.contact_name || '',
      'customer.contact_email': load.customer?.contact_email || '',
      'customer.contact_phone': load.customer?.contact_phone || '',

      // Carrier
      'carrier.company_name': load.carrier?.company_name || '',
      'carrier.mc_number': load.carrier?.mc_number || '',
      'carrier.dot_number': load.carrier?.dot_number || '',
      'carrier.contact_name': load.carrier?.contact_name || '',
      'carrier.contact_phone': load.carrier?.contact_phone || '',
      'carrier.contact_email': load.carrier?.contact_email || '',

      // Driver
      'driver.name': load.driver?.name || '',
      'driver.phone': load.driver?.phone || '',
      'driver.truck_number': load.driver?.truck_number || '',
      'driver.trailer_number': load.driver?.trailer_number || '',

      // Broker
      'broker.name': BROKER_INFO.name,
      'broker.address': BROKER_INFO.address,
      'broker.city_state_zip': BROKER_INFO.city_state_zip,
      'broker.mc': BROKER_INFO.mc,
      'broker.phone': BROKER_INFO.phone,
      'broker.fax': BROKER_INFO.fax,
      'broker.email': BROKER_INFO.email,

      // Generated
      current_date: format(new Date(), 'MM/dd/yyyy'),
      current_time: format(new Date(), 'h:mm a'),
      current_datetime: format(new Date(), 'MM/dd/yyyy h:mm a'),
    }

    // Replace variables in template
    const filledHtml = replaceVariables(template.html_content, variableData)

    // Build full HTML document
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      padding: ${template.margin_top || 50}px ${template.margin_right || 50}px ${template.margin_bottom || 50}px ${template.margin_left || 50}px;
    }
    h1 { font-size: 24px; margin-bottom: 16px; }
    h2 { font-size: 18px; margin-bottom: 12px; }
    h3 { font-size: 14px; margin-bottom: 8px; }
    p { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 600; }
    .mb-4 { margin-bottom: 16px; }
    .mt-4 { margin-top: 16px; }
    ${template.css_styles || ''}
  </style>
</head>
<body>
  ${filledHtml}
</body>
</html>
    `

    // Generate PDF with Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: template.page_size === 'a4' ? 'A4' : template.page_size === 'legal' ? 'Legal' : 'Letter',
      landscape: template.page_orientation === 'landscape',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    })

    await browser.close()

    // Return PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${template.type}_${load.reference_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
