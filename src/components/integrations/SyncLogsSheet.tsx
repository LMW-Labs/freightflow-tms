'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Webhook,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import type { IntegrationSyncLog } from '@/lib/integrations/core/types'

interface SyncLogsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  integrationId: string
  providerName: string
}

const directionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  push: ArrowUpRight,
  pull: ArrowDownLeft,
  webhook: Webhook,
}

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { icon: Clock, color: 'bg-gray-100 text-gray-700' },
  running: { icon: Loader2, color: 'bg-blue-100 text-blue-700' },
  success: { icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  error: { icon: XCircle, color: 'bg-red-100 text-red-700' },
}

export function SyncLogsSheet({
  open,
  onOpenChange,
  integrationId,
  providerName,
}: SyncLogsSheetProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<IntegrationSyncLog[]>([])

  useEffect(() => {
    if (open) {
      fetchLogs()
    }
  }, [open, integrationId])

  const fetchLogs = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('integration_sync_logs')
      .select('*')
      .eq('integration_id', integrationId)
      .order('started_at', { ascending: false })
      .limit(50)

    if (data) {
      setLogs(data as IntegrationSyncLog[])
    }

    setLoading(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Sync History - {providerName}</SheetTitle>
          <SheetDescription>
            Recent sync operations and their status
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">{logs.length} entries</span>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sync logs yet
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const DirectionIcon = directionIcons[log.direction] || ArrowUpRight
                const statusInfo = statusConfig[log.status]
                const StatusIcon = statusInfo?.icon || Clock

                return (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <DirectionIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm">{log.operation}</span>
                      </div>
                      <Badge className={statusInfo?.color}>
                        <StatusIcon
                          className={`h-3 w-3 mr-1 ${log.status === 'running' ? 'animate-spin' : ''}`}
                        />
                        {log.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>
                        Started: {format(new Date(log.started_at), 'MMM dd, yyyy HH:mm:ss')}
                      </p>
                      {log.completed_at && (
                        <p>
                          Duration: {log.duration_ms}ms
                        </p>
                      )}
                      {log.related_table && (
                        <p>
                          Related: {log.related_table}
                          {log.related_id && ` (${log.related_id.slice(0, 8)}...)`}
                        </p>
                      )}
                      {log.external_id && (
                        <p>External ID: {log.external_id}</p>
                      )}
                    </div>

                    {log.error_message && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-400">
                        {log.error_code && <span className="font-mono">[{log.error_code}] </span>}
                        {log.error_message}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
