import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { format } from 'date-fns'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Broker info from env - configurable per deployment
const BROKER_INFO = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'FreightFlow',
  address: process.env.NEXT_PUBLIC_BROKER_ADDRESS || '',
  cityStateZip: process.env.NEXT_PUBLIC_BROKER_CITY_STATE_ZIP || '',
  mc: process.env.NEXT_PUBLIC_BROKER_MC || '',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
  fax: process.env.NEXT_PUBLIC_BROKER_FAX || '',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || '',
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const loadId = searchParams.get('load_id')
    const useTemplate = searchParams.get('use_template') !== 'false' // Default to true

    if (!loadId) {
      return NextResponse.json({ error: 'Load ID required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Fetch load with carrier and customer data
    const { data: load, error: loadError } = await supabase
      .from('loads')
      .select(`
        *,
        carrier:carriers(*),
        customer:customers(*),
        driver:drivers(*)
      `)
      .eq('id', loadId)
      .single()

    if (loadError || !load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 })
    }

    // Check for custom template if enabled
    if (useTemplate) {
      const { data: template } = await supabase
        .from('document_templates')
        .select('*')
        .eq('type', 'rate_confirmation')
        .eq('is_default', true)
        .eq('is_active', true)
        .single()

      if (template) {
        // Use custom template - redirect to the generate-pdf API
        const generateUrl = new URL('/api/generate-pdf', request.url)
        generateUrl.searchParams.set('load_id', loadId)
        generateUrl.searchParams.set('template_type', 'rate_confirmation')

        // Forward the request to generate-pdf
        const response = await fetch(generateUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ load_id: loadId, template_type: 'rate_confirmation' })
        })

        if (response.ok) {
          const pdfBuffer = await response.arrayBuffer()
          return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="RateCon_${load.reference_number}.pdf"`,
            },
          })
        }
        // If template generation fails, fall through to code-generated version
      }
    }

    // Fall back to code-generated PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792]) // Letter size
    const { height } = page.getSize()

    // Embed fonts
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    const black = rgb(0, 0, 0)
    const gray = rgb(0.3, 0.3, 0.3)
    const blue = rgb(0.1, 0.2, 0.6)

    let y = height - 50

    // Helper functions
    const drawText = (text: string, x: number, yPos: number, options: { font?: typeof helvetica, size?: number, color?: typeof black } = {}) => {
      page.drawText(text || '', {
        x,
        y: yPos,
        font: options.font || helvetica,
        size: options.size || 10,
        color: options.color || black,
      })
    }

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.5,
        color: gray,
      })
    }

    // Header - Company Info
    drawText('RATE CONFIRMATION', 50, y, { font: helveticaBold, size: 18, color: blue })
    y -= 25

    drawText(BROKER_INFO.name, 50, y, { font: helveticaBold, size: 12 })
    drawText(`Load #: ${load.reference_number}`, 450, y, { font: helveticaBold, size: 12 })
    y -= 15

    if (BROKER_INFO.address) {
      drawText(BROKER_INFO.address, 50, y, { size: 10 })
      y -= 12
    }

    drawText(`Date: ${format(new Date(), 'MM/dd/yyyy')}`, 450, y - (BROKER_INFO.address ? -12 : 0), { size: 10 })

    if (BROKER_INFO.cityStateZip) {
      drawText(BROKER_INFO.cityStateZip, 50, y, { size: 10 })
      y -= 12
    }

    if (BROKER_INFO.mc) {
      drawText(`MC# ${BROKER_INFO.mc}`, 50, y, { size: 10 })
    }
    if (BROKER_INFO.phone) {
      drawText(`Phone: ${BROKER_INFO.phone}`, 200, y, { size: 10 })
    }
    y -= 25

    drawLine(50, y, 562, y)
    y -= 20

    // Carrier Info Section
    drawText('CARRIER INFORMATION', 50, y, { font: helveticaBold, size: 11, color: blue })
    y -= 18

    const carrier = load.carrier
    drawText('Carrier Name:', 50, y, { font: helveticaBold, size: 9 })
    drawText(carrier?.company_name || 'TBD', 130, y, { size: 10 })
    y -= 14

    drawText('MC Number:', 50, y, { font: helveticaBold, size: 9 })
    drawText(carrier?.mc_number || 'N/A', 130, y, { size: 10 })
    drawText('DOT Number:', 300, y, { font: helveticaBold, size: 9 })
    drawText(carrier?.dot_number || 'N/A', 380, y, { size: 10 })
    y -= 14

    drawText('Contact:', 50, y, { font: helveticaBold, size: 9 })
    drawText(carrier?.contact_name || 'N/A', 130, y, { size: 10 })
    drawText('Phone:', 300, y, { font: helveticaBold, size: 9 })
    drawText(carrier?.contact_phone || 'N/A', 380, y, { size: 10 })
    y -= 25

    drawLine(50, y, 562, y)
    y -= 20

    // Shipment Details Header
    drawText('SHIPMENT DETAILS', 50, y, { font: helveticaBold, size: 11, color: blue })
    y -= 20

    // Two-column layout for pickup and delivery
    const leftCol = 50
    const rightCol = 310

    // Pickup Section
    drawText('PICKUP', leftCol, y, { font: helveticaBold, size: 10, color: blue })
    drawText('DELIVERY', rightCol, y, { font: helveticaBold, size: 10, color: blue })
    y -= 15

    drawText('Location:', leftCol, y, { font: helveticaBold, size: 9 })
    drawText(load.pickup_name || load.origin_address, leftCol + 55, y, { size: 9 })
    drawText('Location:', rightCol, y, { font: helveticaBold, size: 9 })
    drawText(load.delivery_name || load.dest_address, rightCol + 55, y, { size: 9 })
    y -= 12

    drawText('Address:', leftCol, y, { font: helveticaBold, size: 9 })
    drawText(load.origin_address, leftCol + 55, y, { size: 9 })
    drawText('Address:', rightCol, y, { font: helveticaBold, size: 9 })
    drawText(load.dest_address, rightCol + 55, y, { size: 9 })
    y -= 12

    drawText('City/State:', leftCol, y, { font: helveticaBold, size: 9 })
    drawText(`${load.origin_city || ''}, ${load.origin_state || ''}`, leftCol + 55, y, { size: 9 })
    drawText('City/State:', rightCol, y, { font: helveticaBold, size: 9 })
    drawText(`${load.dest_city || ''}, ${load.dest_state || ''}`, rightCol + 55, y, { size: 9 })
    y -= 12

    drawText('Contact:', leftCol, y, { font: helveticaBold, size: 9 })
    drawText(load.pickup_contact || 'N/A', leftCol + 55, y, { size: 9 })
    drawText('Contact:', rightCol, y, { font: helveticaBold, size: 9 })
    drawText(load.delivery_contact || 'N/A', rightCol + 55, y, { size: 9 })
    y -= 12

    drawText('Phone:', leftCol, y, { font: helveticaBold, size: 9 })
    drawText(load.pickup_phone || 'N/A', leftCol + 55, y, { size: 9 })
    drawText('Phone:', rightCol, y, { font: helveticaBold, size: 9 })
    drawText(load.delivery_phone || 'N/A', rightCol + 55, y, { size: 9 })
    y -= 12

    drawText('Date:', leftCol, y, { font: helveticaBold, size: 9 })
    drawText(load.pickup_date ? format(new Date(load.pickup_date), 'MM/dd/yyyy') : 'TBD', leftCol + 55, y, { size: 9 })
    drawText('Date:', rightCol, y, { font: helveticaBold, size: 9 })
    drawText(load.delivery_date ? format(new Date(load.delivery_date), 'MM/dd/yyyy') : 'TBD', rightCol + 55, y, { size: 9 })
    y -= 12

    drawText('Time:', leftCol, y, { font: helveticaBold, size: 9 })
    const pickupTime = load.pickup_time_start ? `${load.pickup_time_start}${load.pickup_time_end ? ' - ' + load.pickup_time_end : ''}` : 'TBD'
    drawText(pickupTime, leftCol + 55, y, { size: 9 })
    drawText('Time:', rightCol, y, { font: helveticaBold, size: 9 })
    const deliveryTime = load.delivery_time_start ? `${load.delivery_time_start}${load.delivery_time_end ? ' - ' + load.delivery_time_end : ''}` : 'TBD'
    drawText(deliveryTime, rightCol + 55, y, { size: 9 })
    y -= 25

    drawLine(50, y, 562, y)
    y -= 20

    // Freight Details
    drawText('FREIGHT DETAILS', 50, y, { font: helveticaBold, size: 11, color: blue })
    y -= 18

    drawText('Commodity:', 50, y, { font: helveticaBold, size: 9 })
    drawText(load.commodity || 'General Freight', 120, y, { size: 10 })
    y -= 14

    drawText('Equipment:', 50, y, { font: helveticaBold, size: 9 })
    drawText(load.equipment_type || 'Van', 120, y, { size: 10 })
    drawText('Weight:', 250, y, { font: helveticaBold, size: 9 })
    drawText(load.weight ? `${load.weight} lbs` : 'N/A', 300, y, { size: 10 })
    y -= 14

    if (load.po_number) {
      drawText('PO#:', 50, y, { font: helveticaBold, size: 9 })
      drawText(load.po_number, 120, y, { size: 10 })
      y -= 14
    }

    if (load.special_instructions) {
      drawText('Special Instructions:', 50, y, { font: helveticaBold, size: 9 })
      y -= 12
      // Word wrap for special instructions
      const words = load.special_instructions.split(' ')
      let line = ''
      for (const word of words) {
        if (line.length + word.length > 80) {
          drawText(line, 50, y, { size: 9 })
          y -= 12
          line = word + ' '
        } else {
          line += word + ' '
        }
      }
      if (line) {
        drawText(line, 50, y, { size: 9 })
        y -= 14
      }
    }
    y -= 10

    drawLine(50, y, 562, y)
    y -= 20

    // Rate Section
    drawText('RATE & PAYMENT TERMS', 50, y, { font: helveticaBold, size: 11, color: blue })
    y -= 18

    drawText('Carrier Rate:', 50, y, { font: helveticaBold, size: 10 })
    drawText(load.carrier_rate ? `$${Number(load.carrier_rate).toFixed(2)}` : 'TBD', 130, y, { font: helveticaBold, size: 12 })
    y -= 14

    drawText('Payment Terms:', 50, y, { font: helveticaBold, size: 9 })
    drawText(load.pay_terms || 'Standard Net 30', 130, y, { size: 10 })
    y -= 14

    drawText('Freight Terms:', 50, y, { font: helveticaBold, size: 9 })
    drawText(load.freight_terms || 'PREPAID', 130, y, { size: 10 })
    y -= 30

    drawLine(50, y, 562, y)
    y -= 20

    // Terms and Conditions
    drawText('TERMS & CONDITIONS', 50, y, { font: helveticaBold, size: 10, color: blue })
    y -= 14

    const terms = [
      '1. Carrier must call for check-calls as required.',
      '2. Driver must obtain signed POD with receiver\'s printed name, date, and time.',
      '3. Carrier is responsible for all cargo claims and must maintain proper insurance.',
      '4. All claims must be filed within 9 months of delivery date.',
      '5. Carrier agrees to the Broker-Carrier Agreement on file.',
    ]

    for (const term of terms) {
      drawText(term, 50, y, { size: 8 })
      y -= 11
    }
    y -= 15

    // Signature Section
    drawLine(50, y, 250, y)
    drawLine(312, y, 512, y)
    y -= 12

    drawText('Carrier Signature / Date', 50, y, { size: 8 })
    drawText('Broker Signature / Date', 312, y, { size: 8 })
    y -= 30

    // Footer
    drawText(`Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm')}`, 50, 30, { size: 8, color: gray })
    drawText('Page 1 of 1', 520, 30, { size: 8, color: gray })

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="RateCon_${load.reference_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Rate con generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate rate confirmation' },
      { status: 500 }
    )
  }
}
