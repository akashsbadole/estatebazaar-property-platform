'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Box, X, ChevronLeft, ChevronRight, Move, Expand, Maximize2 } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  images: string[]
  title?: string
}

export function VirtualTourViewer({ open, onClose, images, title }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [zoom, setZoom] = useState(1)
  const dragStartX = useRef(0)
  const dragStartOffset = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens/closes or active image changes
  useEffect(() => {
    if (!open) return
    // Defer reset to avoid synchronous setState in effect
    const t = setTimeout(() => {
      setOffsetX(0)
      setZoom(1)
    }, 0)
    return () => clearTimeout(t)
  }, [open, activeIdx])

  // Loop the panoramic image (when offset exceeds bounds, wrap around)
  // For simplicity, we'll clamp the offset to a reasonable range
  const computeMaxOffset = () => {
    const imageWidth = 2400 // virtual width of panoramic image
    return (imageWidth * zoom - (containerRef.current?.clientWidth || 800)) / 2
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartOffset.current = offsetX
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const delta = e.clientX - dragStartX.current
    const maxOffset = computeMaxOffset()
    let newOffset = dragStartOffset.current + delta
    // Clamp within bounds
    newOffset = Math.max(-maxOffset, Math.min(maxOffset, newOffset))
    setOffsetX(newOffset)
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    dragStartX.current = e.touches[0]?.clientX || 0
    dragStartOffset.current = offsetX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const delta = (e.touches[0]?.clientX || 0) - dragStartX.current
    const maxOffset = computeMaxOffset()
    let newOffset = dragStartOffset.current + delta
    newOffset = Math.max(-maxOffset, Math.min(maxOffset, newOffset))
    setOffsetX(newOffset)
  }

  const handleTouchEnd = () => setIsDragging(false)

  if (!images || images.length === 0) return null

  const currentImage = images[activeIdx]
  const prevImage = () => setActiveIdx(i => (i - 1 + images.length) % images.length)
  const nextImage = () => setActiveIdx(i => (i + 1) % images.length)

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Virtual Tour — {title || 'Property'}
          </DialogTitle>
          <DialogDescription>
            Click and drag horizontally to look around. Use + and − to zoom.
          </DialogDescription>
        </DialogHeader>

        {/* Tour viewer */}
        <div
          ref={containerRef}
          className="relative w-full h-[60vh] bg-black overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Render the panoramic image twice for seamless looping */}
          <div
            className="absolute top-0 h-full flex"
            style={{
              transform: `translateX(${offsetX}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div className="relative h-full" style={{ width: '2400px' }}>
              <Image
                src={currentImage}
                alt={`360° view ${activeIdx + 1}`}
                fill
                sizes="100vw"
                className="object-cover"
                unoptimized
                priority
                draggable={false}
              />
            </div>
          </div>

          {/* Drag hint overlay (fades on first drag) */}
          {!isDragging && offsetX === 0 && zoom === 1 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
                <Move className="h-4 w-4" /> Drag to look around
              </div>
            </div>
          )}

          {/* Zoom controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md"
              onClick={() => setZoom(z => Math.min(z + 0.25, 2))}
            >
              <Expand className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md"
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
            >
              <Maximize2 className="h-4 w-4 rotate-180" />
            </Button>
          </div>

          {/* Navigation arrows (if multiple tour images) */}
          {images.length > 1 && (
            <>
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-1/2 left-3 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-md"
                onClick={prevImage}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-1/2 right-3 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-md"
                onClick={nextImage}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                Room {activeIdx + 1} of {images.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="p-3 flex gap-2 overflow-x-auto scrollbar-thin">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`relative h-14 w-20 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                  i === activeIdx ? 'border-primary' : 'border-transparent'
                }`}
              >
                <Image src={img} alt={`Thumb ${i + 1}`} fill sizes="80px" className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
