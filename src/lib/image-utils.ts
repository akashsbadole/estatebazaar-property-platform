// Helpers for working with optimized image URLs returned by /api/upload.
//
// The upload endpoint returns URLs for: original, thumb, medium, large.
// We persist the `medium` URL as the canonical image in the DB (good balance
// of quality and size for most use cases). Components that want responsive
// images can construct the other variant URLs from the medium URL.

import type { PropertyWithRelations } from './constants'

export interface ImageVariants {
  original: string
  thumb: string
  medium: string
  large: string
}

// Convert a stored medium URL into all variant URLs.
// /uploads/optimized/abc_medium.webp → { thumb: abc_thumb.webp, medium, large: abc_large.webp, original: /uploads/original/abc.jpg }
export function getImageVariants(mediumUrl: string): ImageVariants {
  // External URLs (Unsplash etc.) — return the same URL for all variants
  if (!mediumUrl.startsWith('/uploads/')) {
    return {
      original: mediumUrl,
      thumb: mediumUrl,
      medium: mediumUrl,
      large: mediumUrl,
    }
  }

  // Try to extract the file ID from the optimized URL pattern
  // /uploads/optimized/<uuid>_<size>.webp
  const match = mediumUrl.match(/^\/uploads\/optimized\/(.+?)_(thumb|medium|large)\.webp$/)
  if (!match) {
    // Fallback: use medium URL for all variants
    return {
      original: mediumUrl,
      thumb: mediumUrl,
      medium: mediumUrl,
      large: mediumUrl,
    }
  }

  const fileId = match[1]!
  return {
    thumb: `/uploads/optimized/${fileId}_thumb.webp`,
    medium: `/uploads/optimized/${fileId}_medium.webp`,
    large: `/uploads/optimized/${fileId}_large.webp`,
    original: `/uploads/original/${fileId}.webp`,
  }
}

// Pick the best image URL for a property based on the desired size.
export function getPropertyImageUrl(
  property: Pick<PropertyWithRelations, 'images'>,
  size: 'thumb' | 'medium' | 'large' = 'medium',
): string {
  const primary = property.images?.find(i => i.isPrimary) || property.images?.[0]
  if (!primary) return '/placeholder-property.svg'
  const variants = getImageVariants(primary.url)
  return variants[size]
}
