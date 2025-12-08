import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIRateQuote, recordRateOutcome } from '@/lib/ai/features/rate-quoting'
import { RateQuoteRequest } from '@/lib/ai/core/types'

// Get AI rate quote
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
    const {
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      equipment_type,
      weight,
      pickup_date,
      special_requirements,
      load_id,
    } = body

    // Validate required fields
    if (!origin_city || !origin_state || !dest_city || !dest_state || !equipment_type) {
      return NextResponse.json(
        { error: 'Missing required fields: origin_city, origin_state, dest_city, dest_state, equipment_type' },
        { status: 400 }
      )
    }

    const request_data: RateQuoteRequest = {
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      equipment_type,
      weight,
      pickup_date,
      special_requirements,
    }

    const result = await getAIRateQuote(
      request_data,
      userData.organization_id,
      user.id,
      load_id
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      quote: result.quote,
      suggestionId: result.suggestionId,
    })
  } catch (error) {
    console.error('Rate quote error:', error)
    return NextResponse.json(
      { error: 'Failed to get rate quote' },
      { status: 500 }
    )
  }
}

// Record outcome/feedback
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      suggestionId,
      actualCustomerRate,
      actualCarrierRate,
      suggestionUsed,
      feedback,
    } = body

    if (!suggestionId || actualCustomerRate === undefined || actualCarrierRate === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await recordRateOutcome(
      suggestionId,
      actualCustomerRate,
      actualCarrierRate,
      suggestionUsed ?? false,
      feedback
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Record outcome error:', error)
    return NextResponse.json(
      { error: 'Failed to record outcome' },
      { status: 500 }
    )
  }
}
