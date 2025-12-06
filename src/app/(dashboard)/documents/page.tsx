'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocumentsClient } from './DocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch document templates
  const { data: templates } = await supabase
    .from('document_templates')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch recent documents (last 50)
  const { data: recentDocuments } = await supabase
    .from('documents')
    .select(`
      *,
      load:loads(id, reference_number)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <DocumentsClient
      templates={templates || []}
      recentDocuments={recentDocuments || []}
    />
  )
}
