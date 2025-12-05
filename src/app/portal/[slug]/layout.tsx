import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Package, LayoutDashboard, LogOut } from 'lucide-react'

interface PortalLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function PortalLayout({ children, params }: PortalLayoutProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*, organization:organizations(*)')
    .eq('slug', slug)
    .single()

  if (!customer || !customer.portal_enabled) {
    notFound()
  }

  const org = customer.organization

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header
        className="border-b bg-white dark:bg-gray-900"
        style={{ borderBottomColor: org?.primary_color || '#3B82F6' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              {org?.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="h-8 w-auto"
                />
              ) : (
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: org?.primary_color || '#3B82F6' }}
                >
                  <Package className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="font-bold text-lg">{customer.company_name}</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href={`/portal/${slug}`}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href={`/portal/${slug}/loads`}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <Package className="h-4 w-4" />
                Shipments
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
