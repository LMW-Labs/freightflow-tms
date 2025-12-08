import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractDocumentData, extractBatchDocuments } from '@/lib/ai/features/document-extraction'

// Extract data from a single document
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const body = await request.json()
    const { documentId, documentIds } = body

    // Batch extraction
    if (documentIds && Array.isArray(documentIds)) {
      const { results, summary } = await extractBatchDocuments(
        documentIds,
        userData.organization_id,
        user.id
      )

      return NextResponse.json({
        success: true,
        results,
        summary,
      })
    }

    // Single document extraction
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId or documentIds required' },
        { status: 400 }
      )
    }

    // Verify document belongs to user's organization
    const { data: document } = await supabase
      .from('documents')
      .select('organization_id')
      .eq('id', documentId)
      .single()

    if (!document || document.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const result = await extractDocumentData(
      documentId,
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
      data: result.data,
      matchedLoadId: result.matchedLoadId,
    })
  } catch (error) {
    console.error('Document extraction error:', error)
    return NextResponse.json(
      { error: 'Failed to extract document data' },
      { status: 500 }
    )
  }
}

// Get extraction status
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
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'documentId required' }, { status: 400 })
    }

    const { data: document } = await supabase
      .from('documents')
      .select('id, extraction_status, extraction_confidence, detected_type, extracted_data, extraction_error, matched_load_id')
      .eq('id', documentId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: document.id,
      status: document.extraction_status || 'pending',
      confidence: document.extraction_confidence,
      detectedType: document.detected_type,
      extractedData: document.extracted_data,
      error: document.extraction_error,
      matchedLoadId: document.matched_load_id,
    })
  } catch (error) {
    console.error('Get extraction status error:', error)
    return NextResponse.json(
      { error: 'Failed to get extraction status' },
      { status: 500 }
    )
  }
}
