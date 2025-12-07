import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail, emailTemplates } from '@/lib/email'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, to, data } = body

    if (!type || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: type, to' },
        { status: 400 }
      )
    }

    let emailContent: { subject: string; html: string; text: string }

    switch (type) {
      case 'load_request_link':
        if (!data?.customerName || !data?.loadRequestUrl) {
          return NextResponse.json(
            { error: 'Missing data: customerName, loadRequestUrl' },
            { status: 400 }
          )
        }
        emailContent = emailTemplates.loadRequestLink(data.customerName, data.loadRequestUrl)
        break

      case 'carrier_onboarding':
        if (!data?.carrierName || !data?.onboardingUrl) {
          return NextResponse.json(
            { error: 'Missing data: carrierName, onboardingUrl' },
            { status: 400 }
          )
        }
        emailContent = emailTemplates.carrierOnboarding(data.carrierName, data.onboardingUrl)
        break

      case 'driver_app_link':
        if (!data?.driverName || !data?.driverUrl) {
          return NextResponse.json(
            { error: 'Missing data: driverName, driverUrl' },
            { status: 400 }
          )
        }
        emailContent = emailTemplates.driverAppLink(data.driverName, data.driverUrl, data.loadRef)
        break

      case 'document_request':
        if (!data?.driverName || !data?.uploadUrl || !data?.documentType || !data?.loadRef) {
          return NextResponse.json(
            { error: 'Missing data: driverName, uploadUrl, documentType, loadRef' },
            { status: 400 }
          )
        }
        emailContent = emailTemplates.documentRequest(
          data.driverName,
          data.uploadUrl,
          data.documentType,
          data.loadRef,
          data.message
        )
        break

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }

    const result = await sendEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    // Log the email send in database (optional)
    try {
      const supabase = getSupabase()
      await supabase.from('email_logs').insert({
        email_type: type,
        recipient: Array.isArray(to) ? to.join(', ') : to,
        subject: emailContent.subject,
        status: 'sent',
        metadata: data,
      })
    } catch (logError) {
      // Don't fail if logging fails - table might not exist yet
      console.warn('Email log failed (table may not exist):', logError)
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
