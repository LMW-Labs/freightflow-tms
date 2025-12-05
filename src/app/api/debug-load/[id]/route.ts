import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Test each part of the query separately
  const results: Record<string, unknown> = {}

  // 1. Basic load data
  const { data: load, error: loadError } = await supabase
    .from('loads')
    .select('*')
    .eq('id', id)
    .single()

  results.load = { data: load, error: loadError?.message }

  if (load) {
    // 2. Customer join
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', load.customer_id)
      .single()

    results.customer = { data: customer, error: customerError?.message }

    // 3. Carrier join
    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select('*')
      .eq('id', load.carrier_id)
      .single()

    results.carrier = { data: carrier, error: carrierError?.message }

    // 4. Driver join (if exists)
    if (load.driver_id) {
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', load.driver_id)
        .single()

      results.driver = { data: driver, error: driverError?.message }
    } else {
      results.driver = { data: null, error: 'No driver_id on load' }
    }

    // 5. Documents
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('load_id', id)

    results.documents = { data: documents, error: documentsError?.message }

    // 6. Status history
    const { data: statusHistory, error: statusError } = await supabase
      .from('status_history')
      .select('*')
      .eq('load_id', id)

    results.status_history = { data: statusHistory, error: statusError?.message }
  }

  return NextResponse.json(results)
}
