'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers
const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const truckIcon = L.divIcon({
  className: 'truck-marker',
  html: `<div style="
    background-color: #3B82F6;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

interface Location {
  lat: number
  lng: number
}

interface TrackingMapProps {
  origin?: Location | null
  destination?: Location | null
  currentLocation?: Location | null
  className?: string
}

function MapBounds({ points }: { points: Location[] }) {
  const map = useMap()

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [map, points])

  return null
}

export function TrackingMap({
  origin,
  destination,
  currentLocation,
  className = '',
}: TrackingMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`} />
    )
  }

  const points: Location[] = []
  if (origin) points.push(origin)
  if (currentLocation) points.push(currentLocation)
  if (destination) points.push(destination)

  // Default center (US)
  const defaultCenter: [number, number] = [39.8283, -98.5795]
  const center = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : origin
    ? [origin.lat, origin.lng]
    : defaultCenter

  return (
    <MapContainer
      center={center as [number, number]}
      zoom={5}
      className={`rounded-lg ${className}`}
      style={{ minHeight: '300px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.length > 0 && <MapBounds points={points} />}

      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={createIcon('#22C55E')}>
          <Popup>
            <strong>Origin (Pickup)</strong>
          </Popup>
        </Marker>
      )}

      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={createIcon('#EF4444')}>
          <Popup>
            <strong>Destination (Delivery)</strong>
          </Popup>
        </Marker>
      )}

      {currentLocation && (
        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={truckIcon}>
          <Popup>
            <strong>Current Location</strong>
          </Popup>
        </Marker>
      )}

      {/* Draw line between points */}
      {origin && destination && (
        <Polyline
          positions={[
            [origin.lat, origin.lng],
            ...(currentLocation ? [[currentLocation.lat, currentLocation.lng] as [number, number]] : []),
            [destination.lat, destination.lng],
          ]}
          color="#3B82F6"
          weight={3}
          opacity={0.6}
          dashArray="10, 10"
        />
      )}
    </MapContainer>
  )
}
