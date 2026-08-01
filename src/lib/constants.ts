// Shared constants and types for the OLX-style property platform

export const PROPERTY_TYPES = [
  { value: 'FLAT', label: 'Flat / Apartment' },
  { value: 'HOUSE', label: 'Independent House' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'PLOT', label: 'Residential Plot' },
  { value: 'BUILDER_FLOOR', label: 'Builder Floor' },
  { value: 'COMMERCIAL', label: 'Commercial Space' },
] as const

export const FURNISHING_TYPES = [
  { value: 'FURNISHED', label: 'Furnished' },
  { value: 'SEMI_FURNISHED', label: 'Semi-Furnished' },
  { value: 'UNFURNISHED', label: 'Unfurnished' },
] as const

export const PROPERTY_STATUS = [
  { value: 'PENDING', label: 'Pending Review', color: 'amber' },
  { value: 'APPROVED', label: 'Approved', color: 'green' },
  { value: 'REJECTED', label: 'Rejected', color: 'red' },
  { value: 'SOLD', label: 'Sold', color: 'slate' },
] as const

export const REPORT_REASONS = [
  { value: 'FRAUD', label: 'Fraud / Scam' },
  { value: 'DUPLICATE', label: 'Duplicate Listing' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'WRONG_INFO', label: 'Wrong Information' },
  { value: 'OTHER', label: 'Other' },
] as const

export const REPORT_STATUS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'REVIEWING', label: 'Reviewing' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
] as const

export const CONTACT_PREFS = [
  { value: 'CALL', label: 'Call only' },
  { value: 'CHAT', label: 'Chat only' },
  { value: 'BOTH', label: 'Call & Chat' },
] as const

export function formatPrice(price: number): string {
  if (price >= 10000000) {
    return `₹ ${(price / 10000000).toFixed(2)} Cr`
  }
  if (price >= 100000) {
    return `₹ ${(price / 100000).toFixed(2)} Lakh`
  }
  return `₹ ${price.toLocaleString('en-IN')}`
}

export function formatPriceFull(price: number): string {
  return `₹ ${price.toLocaleString('en-IN')}`
}

export function timeAgo(date: Date | string): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export interface SafeUser {
  id: string
  name: string
  email: string
  phone?: string | null
  role: 'USER' | 'VENDOR' | 'ADMIN'
  isVerified: boolean
  avatarUrl?: string | null
  joinedDate: string
  subscriptionTier?: string
  brokeragePaid?: boolean
}

export interface PropertyWithRelations {
  id: string
  title: string
  description: string
  type: string
  price: number
  isNegotiable: boolean
  area: number
  furnishing: string
  bedrooms: number
  bathrooms: number
  parking: number
  location: string
  city: string
  state: string
  pincode: string | null
  latitude: number | null
  longitude: number | null
  status: string
  isVerifiedListing?: boolean
  tourImages?: string | null
  contactPhone: string | null
  contactPref: string
  viewCount: number
  createdAt: string
  updatedAt: string
  ownerId: string
  categoryId: string
  owner: {
    id: string
    name: string
    isVerified: boolean
    avatarUrl: string | null
    joinedDate: string
  }
  category: {
    id: string
    name: string
    slug: string
  }
  images: Array<{
    id: string
    url: string
    isPrimary: boolean
  }>
  _count?: {
    favorites: number
    reports: number
  }
  isFavorited?: boolean
}
