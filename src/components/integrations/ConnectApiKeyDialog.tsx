'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Key, ExternalLink } from 'lucide-react'
import type { IntegrationConfig } from '@/lib/integrations/core/types'

interface ConnectApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: IntegrationConfig
  onConnect: (apiKey: string, additionalFields?: Record<string, string>) => Promise<void>
}

// Additional fields required for specific providers
const providerFields: Record<string, { name: string; label: string; placeholder: string }[]> = {
  dat: [
    { name: 'api_key', label: 'API Key', placeholder: 'Enter your DAT API key' },
    { name: 'api_secret', label: 'API Secret', placeholder: 'Enter your DAT API secret' },
  ],
  truckstop: [
    { name: 'api_key', label: 'API Key', placeholder: 'Enter your Truckstop API key' },
  ],
  highway: [
    { name: 'api_key', label: 'API Key', placeholder: 'Enter your Highway API key' },
  ],
  macropoint: [
    { name: 'api_key', label: 'API Key', placeholder: 'Enter your Macropoint API key' },
    { name: 'webhook_secret', label: 'Webhook Secret', placeholder: 'Enter webhook secret (optional)' },
  ],
  denim: [
    { name: 'api_key', label: 'API Key', placeholder: 'Enter your Denim API key' },
    { name: 'webhook_secret', label: 'Webhook Secret', placeholder: 'Enter webhook secret (optional)' },
  ],
}

export function ConnectApiKeyDialog({
  open,
  onOpenChange,
  config,
  onConnect,
}: ConnectApiKeyDialogProps) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const requiredFields = providerFields[config.provider] || [
    { name: 'api_key', label: 'API Key', placeholder: 'Enter your API key' },
  ]

  const handleConnect = async () => {
    setError(null)

    // Validate required fields
    const apiKey = fields.api_key
    if (!apiKey) {
      setError('API key is required')
      return
    }

    setConnecting(true)

    try {
      await onConnect(apiKey, fields)
      onOpenChange(false)
      setFields({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  const updateField = (name: string, value: string) => {
    setFields((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Connect {config.name}
          </DialogTitle>
          <DialogDescription>
            Enter your API credentials to connect {config.name} to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {requiredFields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type={field.name.includes('secret') ? 'password' : 'text'}
                value={fields[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
            <p className="text-blue-700 dark:text-blue-400">
              Need API credentials?{' '}
              {config.docsUrl && (
                <a
                  href={config.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  Visit {config.name} developer portal
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
