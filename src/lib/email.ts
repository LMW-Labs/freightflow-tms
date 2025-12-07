import { Resend } from 'resend'

// Initialize Resend client lazily to avoid build errors
let resendClient: Resend | null = null

function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Configurable branding - set these in .env.local for each deployment
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME || 'FreightFlow'
const COMPANY_ADDRESS = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || ''
const COMPANY_PHONE = process.env.NEXT_PUBLIC_COMPANY_PHONE || ''
const COMPANY_EMAIL = process.env.NEXT_PUBLIC_COMPANY_EMAIL || ''
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || `${COMPANY_NAME} <noreply@example.com>`
const PLATFORM_ADMIN_EMAIL = 'admin@faithfeed.ai'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailOptions) {
  const resend = getResendClient()

  if (!resend) {
    console.warn('RESEND_API_KEY not configured, skipping email send')
    return { success: false, error: 'Email not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

// Helper to build footer
function getEmailFooter() {
  const parts = []
  if (COMPANY_ADDRESS) parts.push(COMPANY_ADDRESS)
  if (COMPANY_PHONE) parts.push(COMPANY_PHONE)
  if (COMPANY_EMAIL) parts.push(COMPANY_EMAIL)

  return parts.length > 0
    ? `<p>${COMPANY_NAME}${parts.length > 0 ? ' | ' + parts.join(' | ') : ''}</p>`
    : `<p>${COMPANY_NAME}</p>`
}

function getTextFooter() {
  const parts = [COMPANY_NAME]
  if (COMPANY_PHONE) parts.push(COMPANY_PHONE)
  if (COMPANY_EMAIL) parts.push(COMPANY_EMAIL)
  return parts.join(' | ')
}

// Email template helpers
export const emailTemplates = {
  loadRequestLink: (customerName: string, loadRequestUrl: string) => ({
    subject: `Request a Load - ${customerName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${COMPANY_NAME}</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin-top: 0;">Request a New Load</h2>

    <p>Hello,</p>

    <p>You can request a new load shipment by clicking the button below. Simply fill out the pickup and delivery details, and our team will get back to you with a quote.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${loadRequestUrl}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Request a Load</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">Or copy this link: <a href="${loadRequestUrl}" style="color: #2563eb;">${loadRequestUrl}</a></p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="margin-bottom: 0;">Thank you for your business!</p>
    <p style="color: #6b7280; margin-top: 5px;">${COMPANY_NAME} Team</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    ${getEmailFooter()}
  </div>
</body>
</html>
    `,
    text: `
Request a New Load

Hello,

You can request a new load shipment using the link below:

${loadRequestUrl}

Simply fill out the pickup and delivery details, and our team will get back to you with a quote.

Thank you for your business!

${getTextFooter()}
    `,
  }),

  carrierOnboarding: (carrierName: string, onboardingUrl: string) => ({
    subject: `Complete Your Carrier Onboarding - ${COMPANY_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${COMPANY_NAME}</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin-top: 0;">Complete Your Carrier Onboarding</h2>

    <p>Hello ${carrierName},</p>

    <p>Welcome to ${COMPANY_NAME}! To start hauling loads with us, please complete your carrier onboarding by clicking the button below.</p>

    <p>You'll need to provide:</p>
    <ul style="color: #4b5563;">
      <li>Company and contact information</li>
      <li>MC/DOT numbers</li>
      <li>W9 and payment details</li>
      <li>Equipment types and preferred lanes</li>
      <li>Sign the Broker-Carrier Agreement</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${onboardingUrl}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Complete Onboarding</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">Or copy this link: <a href="${onboardingUrl}" style="color: #2563eb;">${onboardingUrl}</a></p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="margin-bottom: 0;">Questions? Contact us anytime.</p>
    <p style="color: #6b7280; margin-top: 5px;">${COMPANY_NAME} Team</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    ${getEmailFooter()}
  </div>
</body>
</html>
    `,
    text: `
Complete Your Carrier Onboarding

Hello ${carrierName},

Welcome to ${COMPANY_NAME}! To start hauling loads with us, please complete your carrier onboarding:

${onboardingUrl}

You'll need to provide:
- Company and contact information
- MC/DOT numbers
- W9 and payment details
- Equipment types and preferred lanes
- Sign the Broker-Carrier Agreement

Questions? Contact us anytime.

${getTextFooter()}
    `,
  }),

  driverAppLink: (driverName: string, driverUrl: string, loadRef?: string) => ({
    subject: loadRef ? `Load ${loadRef} - Driver App Link` : `${COMPANY_NAME} - Driver App Link`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${COMPANY_NAME}</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin-top: 0;">Driver App Access</h2>

    <p>Hello ${driverName},</p>

    <p>Use the link below to access the driver app where you can:</p>
    <ul style="color: #4b5563;">
      <li>View load details and delivery instructions</li>
      <li>Update your status (at pickup, loaded, delivered, etc.)</li>
      <li>Upload documents (POD, BOL, photos)</li>
      <li>Share your live location</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${driverUrl}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Open Driver App</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">Or copy this link: <a href="${driverUrl}" style="color: #2563eb;">${driverUrl}</a></p>

    ${loadRef ? `<p style="background: #dbeafe; padding: 12px; border-radius: 6px; color: #1e40af;">Load Reference: <strong>${loadRef}</strong></p>` : ''}

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #6b7280; margin-top: 5px;">${COMPANY_NAME} Team${COMPANY_PHONE ? `<br>${COMPANY_PHONE}` : ''}</p>
  </div>
</body>
</html>
    `,
    text: `
Driver App Access

Hello ${driverName},

Use the link below to access the driver app:

${driverUrl}

You can:
- View load details and delivery instructions
- Update your status
- Upload documents (POD, BOL, photos)
- Share your live location

${loadRef ? `Load Reference: ${loadRef}` : ''}

${getTextFooter()}
    `,
  }),

  documentRequest: (driverName: string, uploadUrl: string, documentType: string, loadRef: string, message?: string) => ({
    subject: `Document Request - Load ${loadRef}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${COMPANY_NAME}</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #1f2937; margin-top: 0;">Document Request</h2>

    <p>Hello ${driverName},</p>

    <p>Please upload the following document for <strong>Load ${loadRef}</strong>:</p>

    <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 18px;">${documentType}</p>
    </div>

    ${message ? `<p style="background: #fef3c7; padding: 12px; border-radius: 6px; color: #92400e;"><strong>Note:</strong> ${message}</p>` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${uploadUrl}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Upload Document</a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">Or copy this link: <a href="${uploadUrl}" style="color: #2563eb;">${uploadUrl}</a></p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #6b7280; margin-top: 5px;">${COMPANY_NAME} Team${COMPANY_PHONE ? `<br>${COMPANY_PHONE}` : ''}</p>
  </div>
</body>
</html>
    `,
    text: `
Document Request

Hello ${driverName},

Please upload the following document for Load ${loadRef}:

${documentType}

${message ? `Note: ${message}` : ''}

Upload here: ${uploadUrl}

${getTextFooter()}
    `,
  }),
}

// Export admin email for platform-level notifications
export const ADMIN_EMAIL = PLATFORM_ADMIN_EMAIL
