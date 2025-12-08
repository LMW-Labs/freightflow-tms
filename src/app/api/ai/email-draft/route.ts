import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateEmailDraft,
  updateEmailDraft,
  markDraftSent,
  getEmailDraft,
  getRecentDrafts,
} from '@/lib/ai/features/email-drafting'
import { EmailTemplateType } from '@/lib/ai/core/types'

// Generate new email draft
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { template_type, context, tone } = body

    // Validate template type
    const validTemplates: EmailTemplateType[] = [
      'rate_con', 'dispatch', 'invoice', 'payment_reminder',
      'load_confirmation', 'pod_request', 'carrier_follow_up', 'customer_update'
    ]

    if (!template_type || !validTemplates.includes(template_type)) {
      return NextResponse.json(
        { error: `Invalid template_type. Must be one of: ${validTemplates.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await generateEmailDraft(
      {
        template_type,
        context: context || {},
        tone: tone || 'professional',
      },
      userData.organization_id,
      user.id
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      draft: result.draft,
      draftId: result.draftId,
    })
  } catch (error) {
    console.error('Email draft error:', error)
    return NextResponse.json(
      { error: 'Failed to generate email draft' },
      { status: 500 }
    )
  }
}

// Get draft or list recent drafts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const draftId = searchParams.get('draftId')

    if (draftId) {
      const draft = await getEmailDraft(draftId)
      if (!draft) {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
      }
      return NextResponse.json({ draft })
    }

    // List recent drafts
    const limit = parseInt(searchParams.get('limit') || '10')
    const drafts = await getRecentDrafts(user.id, limit)

    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Get draft error:', error)
    return NextResponse.json(
      { error: 'Failed to get email draft' },
      { status: 500 }
    )
  }
}

// Update draft
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { draftId, updates, markAsSent, sentVia } = body

    if (!draftId) {
      return NextResponse.json({ error: 'draftId required' }, { status: 400 })
    }

    // Mark as sent
    if (markAsSent) {
      const result = await markDraftSent(draftId, sentVia || 'external')
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }
      return NextResponse.json({ success: true })
    }

    // Update draft content
    if (updates) {
      const result = await updateEmailDraft(draftId, updates)
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  } catch (error) {
    console.error('Update draft error:', error)
    return NextResponse.json(
      { error: 'Failed to update email draft' },
      { status: 500 }
    )
  }
}
