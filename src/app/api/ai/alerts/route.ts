import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  runAlertChecks,
  getActiveAlerts,
  dismissAlert,
  snoozeAlert,
  markAlertRead,
  getAlertCounts,
} from '@/lib/ai/features/alerts'
import { AlertSeverity, AlertType } from '@/lib/ai/core/types'

// Get alerts or run checks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Get counts only
    if (action === 'counts') {
      const counts = await getAlertCounts(userData.organization_id)
      return NextResponse.json({ counts })
    }

    // Run checks
    if (action === 'check') {
      const result = await runAlertChecks(userData.organization_id)
      return NextResponse.json({
        success: true,
        newAlerts: result.alerts.length,
        checksPerformed: result.checksPerformed,
        alerts: result.alerts,
      })
    }

    // Get alerts (default)
    const severity = searchParams.get('severity') as AlertSeverity | null
    const alertType = searchParams.get('type') as AlertType | null
    const limit = parseInt(searchParams.get('limit') || '50')

    const alerts = await getActiveAlerts(userData.organization_id, {
      severity: severity || undefined,
      alertType: alertType || undefined,
      limit,
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Get alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to get alerts' },
      { status: 500 }
    )
  }
}

// Update alert (dismiss, snooze, mark read)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { alertId, action, snoozeHours } = body

    if (!alertId || !action) {
      return NextResponse.json(
        { error: 'alertId and action required' },
        { status: 400 }
      )
    }

    let result: { success: boolean; error?: string }

    switch (action) {
      case 'dismiss':
        result = await dismissAlert(alertId, user.id)
        break
      case 'snooze':
        if (!snoozeHours) {
          return NextResponse.json(
            { error: 'snoozeHours required for snooze action' },
            { status: 400 }
          )
        }
        result = await snoozeAlert(alertId, snoozeHours)
        break
      case 'read':
        result = await markAlertRead(alertId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: dismiss, snooze, or read' },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update alert error:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}

// Trigger alert check (POST for cron jobs)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for automated runs
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Allow authenticated users or cron with secret
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { organizationId } = body

    // If cron job, run for all organizations
    if (!user && !organizationId) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')

      const results = []
      for (const org of orgs || []) {
        const result = await runAlertChecks(org.id)
        results.push({
          organizationId: org.id,
          newAlerts: result.alerts.length,
        })
      }

      return NextResponse.json({
        success: true,
        results,
        totalNewAlerts: results.reduce((sum, r) => sum + r.newAlerts, 0),
      })
    }

    // Single organization check
    let orgId = organizationId
    if (user && !orgId) {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()
      orgId = userData?.organization_id
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const result = await runAlertChecks(orgId)

    return NextResponse.json({
      success: true,
      newAlerts: result.alerts.length,
      checksPerformed: result.checksPerformed,
      alerts: result.alerts,
    })
  } catch (error) {
    console.error('Alert check error:', error)
    return NextResponse.json(
      { error: 'Failed to run alert checks' },
      { status: 500 }
    )
  }
}
