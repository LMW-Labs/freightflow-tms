'use client'

import dynamic from 'next/dynamic'

const TrackingMap = dynamic(
  () => import('@/components/maps/TrackingMap').then((mod) => mod.TrackingMap),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" /> }
)

interface Location {
  lat: number
  lng: number
}

interface TrackingMapWrapperProps {
  origin?: Location | null
  destination?: Location | null
  currentLocation?: Location | null
  className?: string
}

export function TrackingMapWrapper(props: TrackingMapWrapperProps) {
  return <TrackingMap {...props} />
}
