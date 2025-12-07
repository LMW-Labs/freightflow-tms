import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message } = body

    const supabase = getSupabase()

    // Get the current user's info
    const authHeader = request.headers.get('Authorization')
    let userEmail = 'Unknown'
    let userName = 'Unknown'
    let companyName = 'Unknown'

    // Try to get user info from session
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    )

    if (user) {
      // Fetch user details from users table
      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single()

      if (userData) {
        userEmail = userData.email || user.email || 'Unknown'
        userName = userData.name || 'Unknown'
      } else {
        userEmail = user.email || 'Unknown'
      }
    }

    // Get company info from env (the broker's company)
    companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Unknown Company'

    // Send email to admin
    const resend = getResend()
    const { error: emailError } = await resend.emails.send({
      from: `FreightFlow <${process.env.EMAIL_FROM || 'noreply@resend.dev'}>`,
      to: 'admin@faithfeed.ai',
      subject: `Custom Template Design Request - ${companyName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Custom Template Design Request</h1>
          </div>

          <div style="padding: 30px; background: #f9fafb;">
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h2 style="margin-top: 0; color: #1e40af;">Request Details</h2>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Company:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Requested By:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${userName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${userEmail}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; border-radius: 8px; padding: 20px;">
              <h3 style="margin-top: 0; color: #374151;">Customer Message:</h3>
              <div style="background: #f3f4f6; border-radius: 6px; padding: 15px; white-space: pre-wrap;">
                ${message || 'No specific details provided.'}
              </div>
            </div>

            <div style="margin-top: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 14px;">
                Reply directly to this email to respond to ${userName} at ${userEmail}
              </p>
            </div>
          </div>

          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            FreightFlow TMS - White Glove Service Request
          </div>
        </div>
      `,
      replyTo: userEmail !== 'Unknown' ? userEmail : undefined,
    })

    if (emailError) {
      console.error('Email error:', emailError)
      return NextResponse.json(
        { error: 'Failed to send request' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Request custom design error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
