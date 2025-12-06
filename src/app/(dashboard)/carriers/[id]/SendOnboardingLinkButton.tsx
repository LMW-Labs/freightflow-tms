'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FileText, Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface SendOnboardingLinkButtonProps {
  carrierId: string
  carrierName: string
}

export function SendOnboardingLinkButton({ carrierId, carrierName }: SendOnboardingLinkButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const onboardingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/carrier-onboarding/${carrierId}`
    : `/carrier-onboarding/${carrierId}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(onboardingUrl)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Failed to copy link')
    }
  }

  const handleOpenLink = () => {
    window.open(onboardingUrl, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Send Onboarding Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carrier Onboarding Link</DialogTitle>
          <DialogDescription>
            Share this link with {carrierName} to complete their onboarding.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Input
              value={onboardingUrl}
              readOnly
              className="flex-1 text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopy} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={handleOpenLink}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            The carrier will be able to update their information, upload documents, and sign the broker-carrier agreement.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
