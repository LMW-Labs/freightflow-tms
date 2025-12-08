'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Truck,
  ShieldCheck,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { format } from 'date-fns'
import type { IntegrationConfig, IntegrationStatus, OrganizationIntegration } from '@/lib/integrations/core/types'
import { toast } from 'sonner'

interface IntegrationCardProps {
  config: IntegrationConfig
  integration: OrganizationIntegration | null
  onConnect: () => void
  onDisconnect: () => void
  onConfigure: () => void
  onSync?: () => void
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'file-text': FileText,
  truck: Truck,
  'shield-check': ShieldCheck,
  'map-pin': MapPin,
  'credit-card': CreditCard,
}

const statusConfig: Record<
  IntegrationStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  disconnected: { label: 'Not Connected', icon: XCircle, color: 'bg-gray-100 text-gray-700' },
  connecting: { label: 'Connecting...', icon: Loader2, color: 'bg-yellow-100 text-yellow-700' },
  connected: { label: 'Connected', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  error: { label: 'Error', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'bg-orange-100 text-orange-700' },
}

export function IntegrationCard({
  config,
  integration,
  onConnect,
  onDisconnect,
  onConfigure,
  onSync,
}: IntegrationCardProps) {
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const status = integration?.status || 'disconnected'
  const statusInfo = statusConfig[status]
  const Icon = iconMap[config.icon] || FileText
  const StatusIcon = statusInfo.icon

  const handleConnect = async () => {
    setLoading(true)
    try {
      await onConnect()
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${config.name}?`)) return

    setLoading(true)
    try {
      await onDisconnect()
      toast.success(`${config.name} disconnected`)
    } catch (error) {
      toast.error('Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (!onSync) return

    setSyncing(true)
    try {
      await onSync()
      toast.success('Sync completed')
    } catch (error) {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{config.name}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </div>
          </div>
          <Badge className={statusInfo.color}>
            <StatusIcon
              className={`h-3 w-3 mr-1 ${status === 'connecting' ? 'animate-spin' : ''}`}
            />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Features list */}
        <div className="space-y-1">
          {config.features.slice(0, 3).map((feature, i) => (
            <p key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {feature}
            </p>
          ))}
          {config.features.length > 3 && (
            <p className="text-sm text-gray-500">
              +{config.features.length - 3} more features
            </p>
          )}
        </div>

        {/* Connected account info */}
        {integration && status === 'connected' && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            {integration.external_account_name && (
              <p className="font-medium">{integration.external_account_name}</p>
            )}
            {integration.last_sync_at && (
              <p className="text-gray-500">
                Last synced: {format(new Date(integration.last_sync_at), 'MMM dd, yyyy HH:mm')}
              </p>
            )}
            {integration.last_sync_status === 'error' && integration.last_error && (
              <p className="text-red-600 text-xs mt-1">{integration.last_error}</p>
            )}
          </div>
        )}

        {/* Error info */}
        {integration && (status === 'error' || status === 'expired') && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-400">
            <p className="font-medium">
              {status === 'expired' ? 'Connection expired' : 'Connection error'}
            </p>
            {integration.last_error && <p className="text-xs mt-1">{integration.last_error}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {status === 'disconnected' ? (
            <Button onClick={handleConnect} disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Connect
            </Button>
          ) : status === 'connected' ? (
            <>
              {onSync && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onConfigure}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Disconnect
              </Button>
            </>
          ) : status === 'expired' || status === 'error' ? (
            <>
              <Button onClick={handleConnect} disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reconnect
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={loading}
              >
                Disconnect
              </Button>
            </>
          ) : null}
        </div>

        {/* Docs link */}
        {config.docsUrl && (
          <a
            href={config.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            View documentation
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  )
}
