'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Send, Copy, Check, Smartphone, MessageSquare } from 'lucide-react'

interface SendDriverLinkButtonProps {
  driverPhone: string
  driverName: string
}

export function SendDriverLinkButton({ driverPhone, driverName }: SendDriverLinkButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/driver`
    : '/driver'

  const message = `Hi ${driverName}! Download the FreightFlow driver app to track your loads and update status. Open this link on your phone: ${appUrl} - Login with your phone number: ${driverPhone}`

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSMS = () => {
    // Format phone for SMS link
    const cleanPhone = driverPhone.replace(/\D/g, '')
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`
    window.open(smsUrl, '_blank')
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4 mr-1" />
        Send App
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Driver App Link</DialogTitle>
            <DialogDescription>
              Send the driver app link to {driverName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* App Link */}
            <div>
              <p className="text-sm font-medium mb-2">Driver App Link</p>
              <div className="flex gap-2">
                <Input value={appUrl} readOnly className="text-sm" />
                <Button onClick={handleCopy} variant="outline" className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Driver Phone */}
            <div>
              <p className="text-sm font-medium mb-2">Login Phone Number</p>
              <Input value={driverPhone} readOnly className="text-sm bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">
                Driver will enter this phone number to log in
              </p>
            </div>

            {/* Send Options */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Send via:</p>

              <Button onClick={handleSMS} variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send SMS Text Message
              </Button>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      How it works
                    </p>
                    <ol className="text-xs text-blue-800 dark:text-blue-200 mt-1 space-y-1 list-decimal list-inside">
                      <li>Driver opens the link on their phone</li>
                      <li>They enter their phone number to log in</li>
                      <li>They can add it to their home screen as an app</li>
                      <li>They see their assigned loads and can update status</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Preview */}
            <div>
              <p className="text-sm font-medium mb-2">Message Preview</p>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                {message}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
