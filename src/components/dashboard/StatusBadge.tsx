import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LoadStatus } from '@/lib/types/database'

const statusConfig: Record<LoadStatus, { label: string; className: string }> = {
  quoted: {
    label: 'Quoted',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
  booked: {
    label: 'Booked',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  dispatched: {
    label: 'Dispatched',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  },
  en_route_pickup: {
    label: 'En Route to Pickup',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  at_pickup: {
    label: 'At Pickup',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
  loaded: {
    label: 'Loaded',
    className: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100',
  },
  en_route_delivery: {
    label: 'En Route to Delivery',
    className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
  },
  at_delivery: {
    label: 'At Delivery',
    className: 'bg-pink-100 text-pink-800 hover:bg-pink-100',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  invoiced: {
    label: 'Invoiced',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  },
  paid: {
    label: 'Paid',
    className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  },
  complete: {
    label: 'Complete',
    className: 'bg-green-200 text-green-900 hover:bg-green-200',
  },
  customer_paid: {
    label: 'Customer Paid',
    className: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
  },
}

interface StatusBadgeProps {
  status: LoadStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.booked

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
