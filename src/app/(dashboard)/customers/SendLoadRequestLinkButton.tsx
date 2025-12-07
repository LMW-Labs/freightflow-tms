'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Send, Copy, Check, Loader2, ExternalLink } from 'lucide-react'

interface SendLoadRequestLinkButtonProps {
  customerSlug: string
  customerName: string
  customerEmail: string | null
}

export function SendLoadRequestLinkButton({
  customerSlug,
  customerName,
  customerEmail,
}: SendLoadRequestLinkButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState(customerEmail || '')

  const loadRequestUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/portal/${customerSlug}/request-load`
    : `/portal/${customerSlug}/request-load`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(loadRequestUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleSendEmail = async () => {
    if (!email) return
    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'load_request_link',
          to: email,
          data: {
            customerName,
            loadRequestUrl,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      setSent(true)
      setTimeout(() => {
        setSent(false)
        setOpen(false)
      }, 2000)
    } catch (err) {
      console.error('Error sending email:', err)
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) {
        setSent(false)
        setCopied(false)
        setError(null)
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Send load request link">
          <Send className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Load Request Link</DialogTitle>
          <DialogDescription>
            Send {customerName} a link to request a new load
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Load Request URL */}
          <div className="space-y-2">
            <Label>Load Request Link</Label>
            <div className="flex gap-2">
              <Input
                value={loadRequestUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyLink}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              asChild
            >
              <a href={loadRequestUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview
              </a>
            </Button>
          </div>

          {/* Email Section */}
          <div className="pt-4 border-t space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Send via Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSendEmail}
              disabled={!email || sending || sent}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : sent ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {sent ? 'Email Sent!' : sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
