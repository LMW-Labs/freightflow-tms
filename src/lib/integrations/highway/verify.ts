import { createClient } from '@/lib/supabase/server'
import { createHighwayClient, type HighwayCarrierResponse } from './client'
import { IntegrationSyncLogger, updateIntegrationSyncStatus } from '../core/logger'

interface VerificationResult {
  success: boolean
  carrier_id: string
  verification_id?: string
  status: 'verified' | 'failed' | 'flagged' | 'pending'
  authority_status?: string
  insurance_status?: string
  safety_rating?: string
  flags: string[]
  message: string
}

/**
 * Verify a carrier's authority, insurance, and safety status
 */
export async function verifyCarrier(
  carrierId: string,
  organizationId: string,
  triggeredBy?: string
): Promise<VerificationResult> {
  const supabase = await createClient()

  // Get carrier info
  const { data: carrier, error: carrierError } = await supabase
    .from('carriers')
    .select('id, company_name, mc_number, dot_number')
    .eq('id', carrierId)
    .single()

  if (carrierError || !carrier) {
    return {
      success: false,
      carrier_id: carrierId,
      status: 'failed',
      flags: [],
      message: 'Carrier not found',
    }
  }

  if (!carrier.dot_number && !carrier.mc_number) {
    return {
      success: false,
      carrier_id: carrierId,
      status: 'failed',
      flags: [],
      message: 'Carrier has no DOT or MC number to verify',
    }
  }

  // Get integration ID for logging
  const { data: integration } = await supabase
    .from('organization_integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'highway')
    .single()

  if (!integration) {
    return {
      success: false,
      carrier_id: carrierId,
      status: 'failed',
      flags: [],
      message: 'Highway integration not connected',
    }
  }

  const logger = new IntegrationSyncLogger({
    integrationId: integration.id,
    organizationId,
    operation: 'verify_carrier',
    direction: 'pull',
    relatedTable: 'carriers',
    relatedId: carrierId,
    triggeredBy,
    triggerType: triggeredBy ? 'manual' : 'auto',
  })

  try {
    await logger.start()

    const client = await createHighwayClient(organizationId)
    if (!client) {
      throw new Error('Failed to create Highway client')
    }

    // Verify by DOT or MC
    let verifyResult
    if (carrier.dot_number) {
      verifyResult = await client.verifyByDOT(carrier.dot_number)
    } else {
      verifyResult = await client.verifyByMC(carrier.mc_number!)
    }

    if (!verifyResult.success || !verifyResult.data) {
      throw new Error(verifyResult.error?.message || 'Verification failed')
    }

    const data = verifyResult.data
    const flags: string[] = [...data.flags]

    // Analyze authority status
    const commonAuthority = data.authority.find((a) => a.authority_type === 'common')
    const authorityActive = commonAuthority?.status === 'active'
    if (!authorityActive) {
      flags.push('Authority not active')
    }

    // Analyze insurance
    const cargoInsurance = data.insurance.find((i) => i.type === 'cargo')
    const liabilityInsurance = data.insurance.find((i) => i.type === 'liability')

    const insuranceValid =
      cargoInsurance?.status === 'valid' && liabilityInsurance?.status === 'valid'

    if (cargoInsurance?.status !== 'valid') {
      flags.push('Cargo insurance not valid')
    }
    if (liabilityInsurance?.status !== 'valid') {
      flags.push('Liability insurance not valid')
    }

    // Check insurance expiration (within 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    if (cargoInsurance && new Date(cargoInsurance.expiration_date) < thirtyDaysFromNow) {
      flags.push('Cargo insurance expiring soon')
    }
    if (liabilityInsurance && new Date(liabilityInsurance.expiration_date) < thirtyDaysFromNow) {
      flags.push('Liability insurance expiring soon')
    }

    // Analyze safety rating
    const safetyOk =
      data.safety.rating === 'satisfactory' || data.safety.rating === 'none'
    if (data.safety.rating === 'conditional') {
      flags.push('Conditional safety rating')
    }
    if (data.safety.rating === 'unsatisfactory') {
      flags.push('Unsatisfactory safety rating')
    }
    if (data.safety.out_of_service_percentage > 20) {
      flags.push('High out-of-service rate')
    }

    // Determine overall status
    let status: 'verified' | 'failed' | 'flagged' = 'verified'
    if (!authorityActive || !insuranceValid) {
      status = 'failed'
    } else if (flags.length > 0) {
      status = 'flagged'
    }

    // Store verification result
    const { data: verification, error: insertError } = await supabase
      .from('carrier_verifications')
      .insert({
        organization_id: organizationId,
        carrier_id: carrierId,
        provider: 'highway',
        status,
        authority_status: commonAuthority?.status,
        authority_verified_at: new Date().toISOString(),
        insurance_status: insuranceValid ? 'valid' : 'invalid',
        insurance_expires_at: cargoInsurance?.expiration_date,
        insurance_verified_at: new Date().toISOString(),
        cargo_coverage: cargoInsurance?.coverage_amount,
        liability_coverage: liabilityInsurance?.coverage_amount,
        safety_score: data.safety.out_of_service_percentage
          ? 100 - data.safety.out_of_service_percentage
          : null,
        safety_rating: data.safety.rating,
        out_of_service_percentage: data.safety.out_of_service_percentage,
        flags: flags,
        is_blocked: status === 'failed',
        block_reason: status === 'failed' ? flags.join('; ') : null,
        raw_response: data,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        next_verification_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        verified_by: triggeredBy,
        verification_type: triggeredBy ? 'manual' : 'scheduled',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to store verification:', insertError)
    }

    // Update carrier status based on verification
    await supabase
      .from('carriers')
      .update({
        status: status === 'failed' ? 'inactive' : status === 'flagged' ? 'pending' : 'active',
      })
      .eq('id', carrierId)

    await logger.success({
      status,
      authority_status: commonAuthority?.status,
      insurance_valid: insuranceValid,
      safety_rating: data.safety.rating,
      flags_count: flags.length,
    })

    await updateIntegrationSyncStatus(
      integration.id,
      'success',
      `Carrier ${carrier.company_name} verified: ${status}`
    )

    return {
      success: true,
      carrier_id: carrierId,
      verification_id: verification?.id,
      status,
      authority_status: commonAuthority?.status,
      insurance_status: insuranceValid ? 'valid' : 'invalid',
      safety_rating: data.safety.rating,
      flags,
      message: `Carrier verification ${status}${flags.length > 0 ? `: ${flags.join(', ')}` : ''}`,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    await logger.error('VERIFY_FAILED', errorMsg)
    await updateIntegrationSyncStatus(integration.id, 'error', undefined, errorMsg)

    return {
      success: false,
      carrier_id: carrierId,
      status: 'failed',
      flags: [],
      message: `Verification failed: ${errorMsg}`,
    }
  }
}

/**
 * Verify multiple carriers (batch operation)
 */
export async function verifyCarriersBatch(
  carrierIds: string[],
  organizationId: string,
  triggeredBy?: string
): Promise<{ results: VerificationResult[]; summary: { verified: number; flagged: number; failed: number } }> {
  const results: VerificationResult[] = []
  const summary = { verified: 0, flagged: 0, failed: 0 }

  for (const carrierId of carrierIds) {
    const result = await verifyCarrier(carrierId, organizationId, triggeredBy)
    results.push(result)

    if (result.status === 'verified') summary.verified++
    else if (result.status === 'flagged') summary.flagged++
    else summary.failed++

    // Small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return { results, summary }
}

/**
 * Get carriers that need re-verification
 */
export async function getCarriersNeedingVerification(
  organizationId: string
): Promise<string[]> {
  const supabase = await createClient()

  // Get carriers with expired or no verification
  const { data: carriers } = await supabase
    .from('carriers')
    .select(`
      id,
      carrier_verifications!left(
        id,
        next_verification_at,
        status
      )
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  if (!carriers) return []

  const now = new Date()
  return carriers
    .filter((c) => {
      const verifications = c.carrier_verifications as Array<{
        id: string
        next_verification_at: string
        status: string
      }> | null

      if (!verifications || verifications.length === 0) return true

      const latest = verifications.sort(
        (a, b) => new Date(b.next_verification_at).getTime() - new Date(a.next_verification_at).getTime()
      )[0]

      return new Date(latest.next_verification_at) < now
    })
    .map((c) => c.id)
}
