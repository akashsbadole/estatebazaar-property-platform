'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatPrice } from '@/lib/constants'
import type { PropertyWithRelations } from '@/lib/constants'

// Fix Leaflet default marker icon paths in webpack/next
// (we use custom divIcon below, but still need to fix the default paths)
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

interface Props {
  properties: PropertyWithRelations[]
  onSelect: (id: string) => void
}

export function MapView({ properties, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: [22.5937, 78.9629], // Center of India
      zoom: 5,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    mapInstance.current = map

    // Trigger a resize after mount to fix blank tile issues
    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // Update markers when properties change
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const validProperties = properties.filter(p => p.latitude && p.longitude)
    if (validProperties.length === 0) return

    const bounds: [number, number][] = []

    validProperties.forEach(p => {
      const lat = p.latitude!
      const lng = p.longitude!
      bounds.push([lat, lng])

      // Custom price-tag marker
      const priceLabel = formatPrice(p.price)
      const icon = L.divIcon({
        className: 'custom-price-marker',
        html: `<div style="
          background: #0e7490;
          color: white;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 2px solid white;
          cursor: pointer;
          font-family: inherit;
        ">${priceLabel}</div>`,
        iconSize: [80, 24],
        iconAnchor: [40, 12],
        popupAnchor: [0, -12],
      })

      const marker = L.marker([lat, lng], { icon }).addTo(map)

      const primary = p.images?.find(i => i.isPrimary) || p.images?.[0]
      const popupHtml = `
        <div style="width: 200px; font-family: inherit;">
          ${primary ? `<img src="${primary.url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" alt="" />` : ''}
          <div style="font-weight: 700; color: #0e7490; font-size: 14px; margin-bottom: 4px;">${formatPrice(p.price)}</div>
          <div style="font-weight: 600; font-size: 13px; line-height: 1.3; margin-bottom: 4px;">${p.title}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${p.location}, ${p.city}</div>
          <div style="display: flex; gap: 8px; font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ${p.bedrooms > 0 ? `<span>🛏 ${p.bedrooms} BHK</span>` : ''}
            ${p.bathrooms > 0 ? `<span>🛁 ${p.bathrooms}</span>` : ''}
            <span>📐 ${p.area} sqft</span>
          </div>
          <button data-property-id="${p.id}" style="
            background: #0e7490; color: white; border: 0; padding: 6px 12px;
            border-radius: 6px; font-size: 12px; cursor: pointer; width: 100%;
            font-weight: 500;
          ">View Details</button>
        </div>
      `
      marker.bindPopup(popupHtml, { maxWidth: 240, className: 'custom-popup' })

      // Wire up the "View Details" button in the popup
      marker.on('popupopen', () => {
        const popupEl = marker.getPopup()?.getElement()
        const btn = popupEl?.querySelector(`[data-property-id="${p.id}"]`)
        if (btn) {
          btn.addEventListener('click', () => onSelect(p.id))
        }
      })

      markersRef.current.push(marker)
    })

    // Fit bounds to show all markers (with padding)
    if (bounds.length === 1) {
      map.setView(bounds[0], 13)
    } else if (bounds.length > 1) {
      map.fitBounds(bounds as any, { padding: [60, 60] })
    }
  }, [properties, onSelect])

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: '500px' }} />
      {properties.filter(p => p.latitude && p.longitude).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-sm pointer-events-none">
          <div className="text-center bg-card p-4 rounded-lg shadow-md">
            <p className="text-sm font-medium">No mappable properties</p>
            <p className="text-xs text-muted-foreground mt-1">
              None of the current results have coordinates. Try removing filters.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
