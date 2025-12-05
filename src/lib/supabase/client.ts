import { createBrowserClient } from '@supabase/ssr'

// Note: We're not using strict Database types here to avoid RLS policy type conflicts
// In production, you'd want to properly configure RLS policies for each table
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
