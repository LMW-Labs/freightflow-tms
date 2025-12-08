import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { visionCompletion } from '../core/client'
import { buildDocumentExtractionPrompt } from '../core/prompts'
import { ExtractedDocumentData } from '../core/types'

interface ExtractionResult {
  success: boolean
  data?: ExtractedDocumentData
  matchedLoadId?: string
  error?: string
}

// Main extraction function
export async function extractDocumentData(
  documentId: string,
  organizationId: string,
  userId?: string
): Promise<ExtractionResult> {
  const supabase = await createSupabaseClient()

  try {
    // 1. Get document from database
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return { success: false, error: 'Document not found' }
    }

    // 2. Update status to processing
    await supabase
      .from('documents')
      .update({ extraction_status: 'processing' })
      .eq('id', documentId)

    // 3. Get file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (fileError || !fileData) {
      await supabase
        .from('documents')
        .update({
          extraction_status: 'failed',
          extraction_error: 'Failed to download file',
        })
        .eq('id', documentId)
      return { success: false, error: 'Failed to download file' }
    }

    // 4. Convert to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Determine media type
    const contentType = document.file_type || 'image/jpeg'
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
    if (contentType.includes('png')) mediaType = 'image/png'
    else if (contentType.includes('gif')) mediaType = 'image/gif'
    else if (contentType.includes('webp')) mediaType = 'image/webp'

    // Check if it's a PDF - need to handle differently
    if (contentType.includes('pdf')) {
      // For PDFs, we can't use vision directly
      // Would need to convert to images first or use text extraction
      await supabase
        .from('documents')
        .update({
          extraction_status: 'skipped',
          extraction_error: 'PDF extraction requires conversion - coming soon',
        })
        .eq('id', documentId)
      return { success: false, error: 'PDF extraction not yet supported' }
    }

    // 5. Build prompt with hint if document type is known
    const prompt = buildDocumentExtractionPrompt(document.document_type)

    // 6. Call Claude Vision
    const response = await visionCompletion<ExtractedDocumentData>({
      feature: 'document_extraction',
      organizationId,
      userId,
      systemPrompt: prompt,
      imageBase64: base64,
      imageMediaType: mediaType,
      userMessage: 'Extract all relevant shipping/freight information from this document. Return a JSON object with the extracted data.',
    })

    if (!response.success || !response.data) {
      await supabase
        .from('documents')
        .update({
          extraction_status: 'failed',
          extraction_error: response.error || 'Extraction failed',
        })
        .eq('id', documentId)
      return { success: false, error: response.error }
    }

    const extractedData = response.data

    // 7. Try to match to a load if reference number found
    let matchedLoadId: string | undefined
    if (extractedData.reference_number) {
      const { data: matchedLoad } = await supabase
        .from('loads')
        .select('id')
        .eq('organization_id', organizationId)
        .or(`reference_number.eq.${extractedData.reference_number},customer_reference.eq.${extractedData.reference_number}`)
        .single()

      if (matchedLoad) {
        matchedLoadId = matchedLoad.id
      }
    }

    // 8. Update document with extracted data
    await supabase
      .from('documents')
      .update({
        extraction_status: 'completed',
        extracted_data: extractedData,
        extraction_confidence: extractedData.confidence,
        detected_type: extractedData.document_type,
        extracted_at: new Date().toISOString(),
        matched_load_id: matchedLoadId || document.load_id,
        extraction_error: null,
      })
      .eq('id', documentId)

    return {
      success: true,
      data: extractedData,
      matchedLoadId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update document status
    await supabase
      .from('documents')
      .update({
        extraction_status: 'failed',
        extraction_error: errorMessage,
      })
      .eq('id', documentId)

    return { success: false, error: errorMessage }
  }
}

// Batch extraction for multiple documents
export async function extractBatchDocuments(
  documentIds: string[],
  organizationId: string,
  userId?: string
): Promise<{ results: ExtractionResult[]; summary: { success: number; failed: number } }> {
  const results: ExtractionResult[] = []
  let success = 0
  let failed = 0

  // Process in batches of 3 to avoid rate limits
  const batchSize = 3
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(id => extractDocumentData(id, organizationId, userId))
    )

    for (const result of batchResults) {
      results.push(result)
      if (result.success) success++
      else failed++
    }

    // Small delay between batches
    if (i + batchSize < documentIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return { results, summary: { success, failed } }
}

// Get extraction status for documents
export async function getExtractionStatus(
  documentIds: string[],
  organizationId: string
): Promise<Array<{ id: string; status: string; confidence?: number; detectedType?: string }>> {
  const supabase = await createSupabaseClient()

  const { data: documents } = await supabase
    .from('documents')
    .select('id, extraction_status, extraction_confidence, detected_type')
    .eq('organization_id', organizationId)
    .in('id', documentIds)

  return (documents || []).map(doc => ({
    id: doc.id,
    status: doc.extraction_status || 'pending',
    confidence: doc.extraction_confidence,
    detectedType: doc.detected_type,
  }))
}

// Verify extracted data against expected values
export async function verifyExtraction(
  documentId: string,
  expectedData: Partial<ExtractedDocumentData>
): Promise<{ verified: boolean; discrepancies: string[] }> {
  const supabase = await createSupabaseClient()

  const { data: document } = await supabase
    .from('documents')
    .select('extracted_data')
    .eq('id', documentId)
    .single()

  if (!document?.extracted_data) {
    return { verified: false, discrepancies: ['No extracted data found'] }
  }

  const extracted = document.extracted_data as ExtractedDocumentData
  const discrepancies: string[] = []

  // Check each expected field
  for (const [key, expectedValue] of Object.entries(expectedData)) {
    const extractedValue = extracted[key as keyof ExtractedDocumentData]
    if (extractedValue !== expectedValue) {
      discrepancies.push(`${key}: expected "${expectedValue}", got "${extractedValue}"`)
    }
  }

  return {
    verified: discrepancies.length === 0,
    discrepancies,
  }
}

// Update load with extracted POD data
export async function applyPodDataToLoad(
  documentId: string,
  loadId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseClient()

  const { data: document } = await supabase
    .from('documents')
    .select('extracted_data, detected_type')
    .eq('id', documentId)
    .single()

  if (!document?.extracted_data) {
    return { success: false, error: 'No extracted data' }
  }

  const data = document.extracted_data as ExtractedDocumentData

  // Only apply POD data
  if (data.document_type !== 'pod') {
    return { success: false, error: 'Document is not a POD' }
  }

  const updates: Record<string, unknown> = {}

  // Update load with POD data
  if (data.delivery_date) {
    updates.actual_delivery_date = data.delivery_date
  }
  if (data.signature_present !== undefined) {
    updates.pod_received = data.signature_present
  }
  if (data.damage_noted !== undefined && data.damage_noted) {
    updates.has_damage_claim = true
    if (data.damage_description) {
      updates.damage_notes = data.damage_description
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: true } // Nothing to update
  }

  const { error } = await supabase
    .from('loads')
    .update(updates)
    .eq('id', loadId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
