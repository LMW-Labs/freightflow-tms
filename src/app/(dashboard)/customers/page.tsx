import { createClient } from '@/lib/supabase/server'
import { CustomersClient } from './CustomersClient'

export default async function CustomersPage() {
  const supabase = await createClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('company_name')

  // Get load counts for each customer
  const customerIds = customers?.map((c) => c.id) || []
  const { data: loadCounts } = await supabase
    .from('loads')
    .select('customer_id')
    .in('customer_id', customerIds)

  const loadCountMap: Record<string, number> = {}
  loadCounts?.forEach((l) => {
    if (l.customer_id) {
      loadCountMap[l.customer_id] = (loadCountMap[l.customer_id] || 0) + 1
    }
  })

  return (
    <CustomersClient
      customers={customers || []}
      loadCountMap={loadCountMap}
    />
  )
}
