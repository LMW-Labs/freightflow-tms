import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchCarriersToLoad } from '@/lib/ai/features/carrier-matching'
import { CarrierMatchRequest } from '@/lib/ai/core/types'

// Get carrier matches for a load
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
      load_id,
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      equipment_type,
      pickup_date,
      weight,
      special_requirements,
      top_n,
    } = body

    // Validate required fields
    if (!origin_city || !origin_state || !dest_city || !dest_state || !equipment_type || !pickup_date) {
      return NextResponse.json(
        { error: 'Missing required fields: origin_city, origin_state, dest_city, dest_state, equipment_type, pickup_date' },
        { status: 400 }
      )
    }

    const request_data: CarrierMatchRequest = {
      load_id: load_id || '',
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      equipment_type,
      pickup_date,
      weight,
      special_requirements,
    }

    const result = await matchCarriersToLoad(
      request_data,
      userData.organization_id,
      user.id,
      top_n || 5
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      matches: result.matches,
    })
  } catch (error) {
    console.error('Carrier matching error:', error)
    return NextResponse.json(
      { error: 'Failed to match carriers' },
      { status: 500 }
    )
  }
}
