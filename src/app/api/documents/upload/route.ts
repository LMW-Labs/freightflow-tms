import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const formData = await request.formData()
    const file = formData.get('file') as File
    const load_id = formData.get('load_id') as string
    const type = formData.get('type') as string
    const lat = formData.get('lat') as string | null
    const lng = formData.get('lng') as string | null

    if (!file || !load_id || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${load_id}/${type}_${Date.now()}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Create document record
    const { error: dbError } = await supabase.from('documents').insert({
      load_id,
      type,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      captured_lat: lat ? parseFloat(lat) : null,
      captured_lng: lng ? parseFloat(lng) : null,
      captured_at: new Date().toISOString(),
      uploaded_by_type: 'driver',
    })

    if (dbError) {
      console.error('DB error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save document record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
