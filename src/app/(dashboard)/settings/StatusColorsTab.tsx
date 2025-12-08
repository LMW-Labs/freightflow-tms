'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RotateCcw } from 'lucide-react'

// Load statuses
const loadStatuses = [
  { key: 'quoted', label: 'Quoted' },
  { key: 'booked', label: 'Booked' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'en_route_pickup', label: 'En Route to Pickup' },
  { key: 'at_pickup', label: 'At Pickup' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'at_delivery', label: 'At Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'invoiced', label: 'Invoiced' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
]

// Default colors
const defaultColors: Record<string, string> = {
  quoted: '#6B7280',      // gray
  booked: '#3B82F6',      // blue
  dispatched: '#8B5CF6',  // purple
  en_route_pickup: '#F59E0B', // amber
  at_pickup: '#F97316',   // orange
  in_transit: '#06B6D4',  // cyan
  at_delivery: '#10B981', // emerald
  delivered: '#22C55E',   // green
  invoiced: '#6366F1',    // indigo
  paid: '#059669',        // emerald dark
  cancelled: '#EF4444',   // red
}

// Large palette
const largePalette = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#6B7280',
  '#374151', '#1F2937', '#059669', '#0284C7', '#7C3AED', '#DB2777',
]

// Small palette
const smallPalette = [
  '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280',
]

interface StatusColorsTabProps {
  statusColors: Record<string, string>
  onChange: (colors: Record<string, string>) => void
  disabled?: boolean
}

export function StatusColorsTab({ statusColors, onChange, disabled }: StatusColorsTabProps) {
  const [paletteSize, setPaletteSize] = useState<'small' | 'large'>('large')
  const currentPalette = paletteSize === 'large' ? largePalette : smallPalette

  const handleColorChange = (statusKey: string, color: string) => {
    onChange({ ...statusColors, [statusKey]: color })
  }

  const resetToDefaults = () => {
    onChange(defaultColors)
  }

  const getColor = (statusKey: string) => {
    return statusColors[statusKey] || defaultColors[statusKey]
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Status Colors</CardTitle>
            <CardDescription>
              Customize the colors used for load statuses throughout the platform
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={paletteSize} onValueChange={(v) => setPaletteSize(v as 'small' | 'large')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="large">Full Palette</SelectItem>
                <SelectItem value="small">Simple</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              disabled={disabled}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-muted/50">
            {loadStatuses.map((status) => (
              <Badge
                key={status.key}
                style={{
                  backgroundColor: `${getColor(status.key)}20`,
                  color: getColor(status.key),
                  borderColor: getColor(status.key),
                }}
                className="border"
              >
                {status.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadStatuses.map((status) => (
            <div key={status.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{status.label}</Label>
                <Badge
                  style={{
                    backgroundColor: `${getColor(status.key)}20`,
                    color: getColor(status.key),
                    borderColor: getColor(status.key),
                  }}
                  className="border text-xs"
                >
                  {status.label}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-background">
                {currentPalette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(status.key, color)}
                    disabled={disabled}
                    className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${
                      getColor(status.key) === color
                        ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-400'
                        : 'border-transparent'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {/* Custom color picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={getColor(status.key)}
                    onChange={(e) => handleColorChange(status.key, e.target.value)}
                    disabled={disabled}
                    className="w-7 h-7 rounded-md cursor-pointer border-2 border-dashed border-gray-300"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Click a color swatch to select it, or use the color picker on the right for a custom color.
        </p>
      </CardContent>
    </Card>
  )
}
