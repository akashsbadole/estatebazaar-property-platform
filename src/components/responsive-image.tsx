'use client'

import Image from 'next/image'
import { getImageVariants } from '@/lib/image-utils'

// ResponsiveImage wraps next/image and picks the best WebP variant
// from the optimized uploads (thumb/medium/large).
//
// For external URLs (Unsplash, etc.), it falls back to the original URL.
//
// Always uses `fill` mode (the parent container must be `relative` with a
// defined aspect ratio). This avoids the need for explicit width/height props.

interface ResponsiveImageProps {
  src: string
  alt: string
  sizes?: string
  className?: string
  priority?: boolean
}

export function ResponsiveImage({ src, alt, sizes, className, priority }: ResponsiveImageProps) {
  // Get all variant URLs from the stored URL
  const variants = getImageVariants(src)

  // Pick the best variant:
  // - For card thumbnails (small), use medium (800px) — good balance
  // - For detail page (large), use large (1200px)
  const bestUrl = variants.medium || src

  return (
    <Image
      src={bestUrl}
      alt={alt}
      fill
      sizes={sizes || '(max-width: 768px) 100vw, 33vw'}
      className={className}
      unoptimized
      priority={priority}
    />
  )
}
