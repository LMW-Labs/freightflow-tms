import { createClient } from '@/lib/supabase/server'
import { InviteStaffDialog } from './InviteStaffDialog'
import { TeamClient } from './TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: currentUser } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user?.id)
    .single()

  const isAdmin = currentUser?.role === 'admin'

  // Get team members
  const { data: teamMembers } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', currentUser?.organization_id)
    .order('created_at', { ascending: false })

  // Get pending invites (only for admins)
  let pendingInvites: any[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('staff_invites')
      .select('*')
      .eq('organization_id', currentUser?.organization_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    pendingInvites = data || []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your team members and invites
          </p>
        </div>
        {isAdmin && <InviteStaffDialog />}
      </div>

      <TeamClient
        teamMembers={teamMembers || []}
        pendingInvites={pendingInvites}
        currentUserId={user?.id || ''}
        isAdmin={isAdmin}
      />
    </div>
  )
}
