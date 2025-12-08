'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plug, FileText, Truck, Shield, MapPin, CreditCard, ArrowLeft, History } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IntegrationCard } from '@/components/integrations/IntegrationCard'
import { ConnectApiKeyDialog } from '@/components/integrations/ConnectApiKeyDialog'
import { SyncLogsSheet } from '@/components/integrations/SyncLogsSheet'
import {
  INTEGRATION_CONFIGS,
  type IntegrationProvider,
  type OrganizationIntegration,
  type IntegrationConfig,
} from '@/lib/integrations/core/types'

const categoryIcons = {
  accounting: FileText,
  loadboard: Truck,
  carrier: Shield,
  tracking: MapPin,
  payments: CreditCard,
}

const categoryLabels = {
  accounting: 'Accounting',
  loadboard: 'Load Boards',
  carrier: 'Carrier Vetting',
  tracking: 'Tracking',
  payments: 'Payments',
}

export default function IntegrationsSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [integrations, setIntegrations] = useState<Record<IntegrationProvider, OrganizationIntegration | null>>({
    quickbooks: null,
    dat: null,
    truckstop: null,
    highway: null,
    macropoint: null,
    denim: null,
  })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // Dialog state
  const [connectDialog, setConnectDialog] = useState<{
    open: boolean
    config: IntegrationConfig | null
  }>({ open: false, config: null })

  const [logsSheet, setLogsSheet] = useState<{
    open: boolean
    integrationId: string
    providerName: string
  }>({ open: false, integrationId: '', providerName: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (userData) {
      setUserRole(userData.role)
      setOrganizationId(userData.organization_id)

      // Fetch all integrations for this organization
      const { data: integrationsData } = await supabase
        .from('organization_integrations')
        .select('*')
        .eq('organization_id', userData.organization_id)

      if (integrationsData) {
        const integrationsMap = { ...integrations }
        integrationsData.forEach((integration: OrganizationIntegration) => {
          integrationsMap[integration.provider] = integration
        })
        setIntegrations(integrationsMap)
      }
    }

    setLoading(false)
  }

  const canManageIntegrations = userRole === 'admin' || userRole === 'broker'

  const handleConnect = (config: IntegrationConfig) => {
    if (config.authType === 'oauth2') {
      // Redirect to OAuth flow
      window.location.href = `/api/integrations/${config.provider}/connect`
    } else {
      // Show API key dialog
      setConnectDialog({ open: true, config })
    }
  }

  const handleApiKeyConnect = async (
    config: IntegrationConfig,
    apiKey: string,
    additionalFields?: Record<string, string>
  ) => {
    if (!organizationId) return

    try {
      const response = await fetch(`/api/integrations/${config.provider}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          ...additionalFields,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to connect')
      }

      toast.success(`${config.name} connected successfully`)
      setConnectDialog({ open: false, config: null })
      fetchData()
    } catch (error) {
      throw error
    }
  }

  const handleDisconnect = async (provider: IntegrationProvider) => {
    try {
      const response = await fetch(`/api/integrations/${provider}/disconnect`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      fetchData()
    } catch (error) {
      throw error
    }
  }

  const handleViewLogs = (integration: OrganizationIntegration) => {
    const config = INTEGRATION_CONFIGS[integration.provider]
    setLogsSheet({
      open: true,
      integrationId: integration.id,
      providerName: config.name,
    })
  }

  // Group integrations by category
  const categories = Object.entries(INTEGRATION_CONFIGS).reduce(
    (acc, [provider, config]) => {
      if (!acc[config.category]) {
        acc[config.category] = []
      }
      acc[config.category].push({ provider: provider as IntegrationProvider, config })
      return acc
    },
    {} as Record<string, { provider: IntegrationProvider; config: IntegrationConfig }[]>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Integrations
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Connect third-party services to enhance your TMS
          </p>
        </div>
      </div>

      {!canManageIntegrations && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <p className="text-yellow-700 dark:text-yellow-400">
              Only administrators and brokers can manage integrations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Integration Categories */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">
            <Plug className="h-4 w-4 mr-2" />
            All
          </TabsTrigger>
          {Object.entries(categories).map(([category]) => {
            const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons]
            return (
              <TabsTrigger key={category} value={category}>
                <CategoryIcon className="h-4 w-4 mr-2" />
                {categoryLabels[category as keyof typeof categoryLabels]}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* All integrations */}
        <TabsContent value="all" className="space-y-6">
          {Object.entries(categories).map(([category, items]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {(() => {
                  const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons]
                  return <CategoryIcon className="h-5 w-5 text-gray-400" />
                })()}
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map(({ provider, config }) => (
                  <IntegrationCard
                    key={provider}
                    config={config}
                    integration={integrations[provider]}
                    onConnect={() => handleConnect(config)}
                    onDisconnect={() => handleDisconnect(provider)}
                    onConfigure={() => {
                      const integration = integrations[provider]
                      if (integration) {
                        handleViewLogs(integration)
                      }
                    }}
                    onSync={
                      integrations[provider]?.status === 'connected'
                        ? async () => {
                            // Trigger sync
                            const response = await fetch(`/api/integrations/${provider}/sync`, {
                              method: 'POST',
                            })
                            if (!response.ok) {
                              throw new Error('Sync failed')
                            }
                            fetchData()
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Category-specific tabs */}
        {Object.entries(categories).map(([category, items]) => (
          <TabsContent key={category} value={category}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(({ provider, config }) => (
                <IntegrationCard
                  key={provider}
                  config={config}
                  integration={integrations[provider]}
                  onConnect={() => handleConnect(config)}
                  onDisconnect={() => handleDisconnect(provider)}
                  onConfigure={() => {
                    const integration = integrations[provider]
                    if (integration) {
                      handleViewLogs(integration)
                    }
                  }}
                  onSync={
                    integrations[provider]?.status === 'connected'
                      ? async () => {
                          const response = await fetch(`/api/integrations/${provider}/sync`, {
                            method: 'POST',
                          })
                          if (!response.ok) {
                            throw new Error('Sync failed')
                          }
                          fetchData()
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Connect API Key Dialog */}
      {connectDialog.config && (
        <ConnectApiKeyDialog
          open={connectDialog.open}
          onOpenChange={(open) => setConnectDialog({ ...connectDialog, open })}
          config={connectDialog.config}
          onConnect={(apiKey, additionalFields) =>
            handleApiKeyConnect(connectDialog.config!, apiKey, additionalFields)
          }
        />
      )}

      {/* Sync Logs Sheet */}
      <SyncLogsSheet
        open={logsSheet.open}
        onOpenChange={(open) => setLogsSheet({ ...logsSheet, open })}
        integrationId={logsSheet.integrationId}
        providerName={logsSheet.providerName}
      />
    </div>
  )
}
