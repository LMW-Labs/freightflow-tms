import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create supabase client lazily to avoid build errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const { load_id, lat, lng, speed, heading } = await request.json()

    if (!load_id || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the load to find driver_id
    const { data: load } = await supabase
      .from('loads')
      .select('driver_id')
      .eq('id', load_id)
      .single()

    // Insert location history
    await supabase.from('location_history').insert({
      load_id,
      driver_id: load?.driver_id,
      lat,
      lng,
      speed: speed || null,
      heading: heading || null,
    })

    // Update current location on load
    await supabase
      .from('loads')
      .update({
        current_lat: lat,
        current_lng: lng,
        current_location_updated_at: new Date().toISOString(),
      })
      .eq('id', load_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Location update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
