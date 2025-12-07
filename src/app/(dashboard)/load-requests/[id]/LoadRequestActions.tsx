'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DollarSign, Loader2, ArrowRight, X, Check } from 'lucide-react'
import { LoadRequest } from '@/lib/types/database'

interface LoadRequestActionsProps {
  request: LoadRequest & {
    customer?: { id: string; company_name: string } | null
  }
}

export function LoadRequestActions({ request }: LoadRequestActionsProps) {
  const router = useRouter()
  const supabase = createClient()
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [quotedRate, setQuotedRate] = useState(request.quoted_rate?.toString() || '')
  const [carrierRate, setCarrierRate] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const handleQuote = async () => {
    if (!quotedRate) return
    setQuoting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      await supabase
        .from('load_requests')
        .update({
          status: 'quoted',
          quoted_rate: parseFloat(quotedRate),
          quoted_at: new Date().toISOString(),
          quoted_by: user?.id,
        })
        .eq('id', request.id)

      setQuoteOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error quoting:', error)
      alert('Error submitting quote')
    } finally {
      setQuoting(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this request?')) return
    setRejecting(true)

    try {
      await supabase
        .from('load_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id)

      router.refresh()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Error rejecting request')
    } finally {
      setRejecting(false)
    }
  }

  const handleConvert = async () => {
    if (!quotedRate || !carrierRate) return
    setConverting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Generate new load reference number (LB prefix for "Load Booked")
      const timestamp = Date.now().toString().slice(-6)
      const reference_number = `LB00-${timestamp}`

      // Create the load
      const { data: newLoad, error: loadError } = await supabase
        .from('loads')
        .insert({
          reference_number,
          customer_id: request.customer_id,
          status: 'booked',
          origin_address: request.pickup_address,
          origin_city: request.pickup_city,
          origin_state: request.pickup_state,
          pickup_date: request.pickup_date,
          pickup_time_start: request.pickup_time_start,
          pickup_time_end: request.pickup_time_end,
          pickup_name: request.pickup_name,
          pickup_contact: request.pickup_contact,
          pickup_phone: request.pickup_phone,
          pickup_notes: request.pickup_notes,
          dest_address: request.delivery_address,
          dest_city: request.delivery_city,
          dest_state: request.delivery_state,
          delivery_date: request.delivery_date,
          delivery_time_start: request.delivery_time_start,
          delivery_time_end: request.delivery_time_end,
          delivery_name: request.delivery_name,
          delivery_contact: request.delivery_contact,
          delivery_phone: request.delivery_phone,
          delivery_notes: request.delivery_notes,
          commodity: request.commodity,
          weight: request.weight,
          equipment_type: request.equipment_type || 'Van',
          special_instructions: request.special_instructions,
          customer_rate: parseFloat(quotedRate),
          carrier_rate: parseFloat(carrierRate),
          booked_date: new Date().toISOString(),
          load_type: 'TL',
        })
        .select()
        .single()

      if (loadError) throw loadError

      // Update the request
      await supabase
        .from('load_requests')
        .update({
          status: 'converted',
          converted_load_id: newLoad.id,
        })
        .eq('id', request.id)

      // Navigate to the new load
      router.push(`/loads/${newLoad.id}`)
    } catch (error) {
      console.error('Error converting:', error)
      alert('Error converting to load')
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Quote Button */}
      {(request.status === 'pending' || request.status === 'quoted') && (
        <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <DollarSign className="h-4 w-4 mr-2" />
              {request.status === 'quoted' ? 'Update Quote' : 'Provide Quote'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Provide Quote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="quoted_rate">Customer Rate ($)</Label>
                <Input
                  id="quoted_rate"
                  type="number"
                  step="0.01"
                  value={quotedRate}
                  onChange={(e) => setQuotedRate(e.target.value)}
                  placeholder="Enter customer rate"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleQuote}
                disabled={!quotedRate || quoting}
              >
                {quoting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Submit Quote
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Convert to Load Button */}
      {request.status === 'quoted' && (
        <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
          <DialogTrigger asChild>
            <Button>
              <ArrowRight className="h-4 w-4 mr-2" />
              Convert to Load
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert to Load</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                This will create a new load from this request and mark it as booked.
              </p>

              <div className="space-y-2">
                <Label htmlFor="customer_rate">Customer Rate ($)</Label>
                <Input
                  id="customer_rate"
                  type="number"
                  step="0.01"
                  value={quotedRate}
                  onChange={(e) => setQuotedRate(e.target.value)}
                  placeholder="Customer rate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carrier_rate">Carrier Rate ($)</Label>
                <Input
                  id="carrier_rate"
                  type="number"
                  step="0.01"
                  value={carrierRate}
                  onChange={(e) => setCarrierRate(e.target.value)}
                  placeholder="Carrier rate"
                />
              </div>

              {quotedRate && carrierRate && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Customer Rate:</span>
                    <span className="font-medium">${parseFloat(quotedRate).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Carrier Rate:</span>
                    <span className="font-medium">${parseFloat(carrierRate).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t">
                    <span>Margin:</span>
                    <span className={parseFloat(quotedRate) - parseFloat(carrierRate) > 0 ? 'text-green-600' : 'text-red-600'}>
                      ${(parseFloat(quotedRate) - parseFloat(carrierRate)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleConvert}
                disabled={!quotedRate || !carrierRate || converting}
              >
                {converting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Create Load
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Button */}
      {(request.status === 'pending' || request.status === 'quoted') && (
        <Button
          variant="outline"
          className="text-red-600 hover:text-red-700"
          onClick={handleReject}
          disabled={rejecting}
        >
          {rejecting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Reject
        </Button>
      )}
    </div>
  )
}
