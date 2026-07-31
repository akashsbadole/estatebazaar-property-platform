'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  X,
  MapPin,
  Tag,
  Home as HomeIcon,
  Image as ImageIcon,
  IndianRupee,
  CheckCircle2,
  Loader2,
  Eye,
  Edit3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useApp } from '@/lib/store'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'
import {
  PROPERTY_TYPES,
  FURNISHING_TYPES,
  CONTACT_PREFS,
  formatPrice,
  type PropertyWithRelations,
} from '@/lib/constants'
import { toast } from 'sonner'

interface CategoriesResponse {
  items: Array<{ id: string; name: string; slug: string }>
}

interface UploadedImage {
  url: string
  isPrimary: boolean
  localPreview?: string
}

interface DetailResponse {
  property: PropertyWithRelations
  similar: PropertyWithRelations[]
}

const STEPS = ['Category', 'Details', 'Photos', 'Pricing', 'Review'] as const

interface PostViewProps {
  /** When provided, the view operates in edit mode (loads existing property, submits via PUT) */
  editPropertyId?: string
}

export function PostView({ editPropertyId }: PostViewProps) {
  const { navigate, user } = useApp()
  const isEditMode = !!editPropertyId
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState<CategoriesResponse['items']>([])
  const [loading, setLoading] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(isEditMode)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [type, setType] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [area, setArea] = useState<string>('')
  const [bedrooms, setBedrooms] = useState<string>('')
  const [bathrooms, setBathrooms] = useState<string>('')
  const [parking, setParking] = useState<string>('')
  const [furnishing, setFurnishing] = useState<string>('UNFURNISHED')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [state_, setState_] = useState('')
  const [pincode, setPincode] = useState('')
  const [latitude, setLatitude] = useState<string>('')
  const [longitude, setLongitude] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [contactPhone, setContactPhone] = useState(user?.phone || '')
  const [contactPref, setContactPref] = useState<string>('BOTH')
  const [images, setImages] = useState<UploadedImage[]>([])
  // Track original status so we can show the right messaging (e.g. re-approval needed)
  const [originalStatus, setOriginalStatus] = useState<string>('')

  // Load categories
  useEffect(() => {
    apiGet<CategoriesResponse>('/api/categories')
      .then(c => setCategories(c.items))
      .catch(() => toast.error('Failed to load categories'))
  }, [])

  // In edit mode, load the existing property and pre-populate the form
  useEffect(() => {
    if (!editPropertyId) return
    setLoadingInitial(true)
    apiGet<DetailResponse>(`/api/properties/${editPropertyId}`)
      .then(res => {
        const p = res.property
        setType(p.type)
        setCategoryId(p.categoryId)
        setTitle(p.title)
        setDescription(p.description)
        setArea(String(p.area))
        setBedrooms(p.bedrooms ? String(p.bedrooms) : '')
        setBathrooms(p.bathrooms ? String(p.bathrooms) : '')
        setParking(p.parking ? String(p.parking) : '')
        setFurnishing(p.furnishing)
        setLocation(p.location)
        setCity(p.city)
        setState_(p.state)
        setPincode(p.pincode || '')
        setLatitude(p.latitude ? String(p.latitude) : '')
        setLongitude(p.longitude ? String(p.longitude) : '')
        setPrice(String(p.price))
        setIsNegotiable(p.isNegotiable)
        setContactPhone(p.contactPhone || user?.phone || '')
        setContactPref(p.contactPref)
        setImages(
          (p.images || []).map(img => ({
            url: img.url,
            isPrimary: img.isPrimary,
          })),
        )
        setOriginalStatus(p.status)
      })
      .catch(err => {
        toast.error(err.message || 'Failed to load property for editing')
        navigate({ name: 'my-listings' })
      })
      .finally(() => setLoadingInitial(false))
  }, [editPropertyId, user, navigate])

  const detectLocation = () => {
    if (!navigator.geography) {
      toast.error('Geolocation not supported')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(String(pos.coords.latitude))
        setLongitude(String(pos.coords.longitude))
        toast.success('Location captured')
      },
      () => toast.error('Could not get location. Please enter manually.'),
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10 - images.length)
    if (files.length === 0) return

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB`)
        continue
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`)
        continue
      }
      const localPreview = URL.createObjectURL(file)
      // Convert to base64 and upload
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const res = await apiPost<{ original: string; thumb: string; medium: string; large: string; url?: string }>('/api/upload', {
            base64: reader.result as string,
            filename: file.name,
          })
          // Use the medium variant as the stored URL — best balance of quality & size
          const storedUrl = res.medium || res.url || res.original
          setImages(prev => [
            ...prev,
            { url: storedUrl, isPrimary: prev.length === 0, localPreview },
          ])
        } catch (err: any) {
          toast.error(`Upload failed: ${err.message}`)
        }
      }
      reader.readAsDataURL(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (idx: number) => {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx)
      if (next.length > 0 && !next.some(i => i.isPrimary)) {
        next[0].isPrimary = true
      }
      return next
    })
  }

  const setPrimary = (idx: number) => {
    setImages(prev => prev.map((img, i) => ({ ...img, isPrimary: i === idx })))
  }

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!type) return 'Please select a property type'
      if (!categoryId) return 'Please select a category'
    }
    if (s === 1) {
      if (!title.trim()) return 'Title is required'
      if (!description.trim()) return 'Description is required'
      if (!area || Number(area) <= 0) return 'Valid area is required'
      if (!location.trim()) return 'Location is required'
      if (!city.trim()) return 'City is required'
      if (!state_.trim()) return 'State is required'
    }
    if (s === 2) {
      if (images.length === 0) return 'Please upload at least one photo'
    }
    if (s === 3) {
      if (!price || Number(price) <= 0) return 'Valid price is required'
    }
    return null
  }

  const next = () => {
    const err = validateStep(step)
    if (err) {
      toast.error(err)
      return
    }
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  const back = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const submit = async () => {
    const err = validateStep(3)
    if (err) return toast.error(err)
    setLoading(true)
    const payload = {
      type,
      categoryId,
      title: title.trim(),
      description: description.trim(),
      area: Number(area),
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      parking: Number(parking) || 0,
      furnishing,
      location: location.trim(),
      city: city.trim(),
      state: state_.trim(),
      pincode: pincode || undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      price: Number(price),
      isNegotiable,
      contactPhone: contactPhone || undefined,
      contactPref,
      images: images.map(i => ({ url: i.url, isPrimary: i.isPrimary })),
    }
    try {
      if (isEditMode && editPropertyId) {
        const res = await apiPut<{ property: PropertyWithRelations; message: string }>(
          `/api/properties/${editPropertyId}`,
          payload,
        )
        toast.success(res.message)
        navigate({ name: 'detail', propertyId: res.property.id })
      } else {
        const res = await apiPost<{ property: PropertyWithRelations; message: string }>(
          '/api/properties',
          payload,
        )
        toast.success(res.message)
        navigate({ name: 'detail', propertyId: res.property.id })
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to ${isEditMode ? 'update' : 'post'} property`)
    } finally {
      setLoading(false)
    }
  }

  // Show a loading skeleton while pre-populating the form in edit mode
  if (loadingInitial) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl animate-fade-in">
        <div className="text-center mb-6">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-80 mx-auto mt-2" />
        </div>
        <Card className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <Skeleton className="h-10 w-10 rounded-full" />
                {i < STEPS.length - 1 && <div className="flex-1 h-0.5 mx-2 bg-border" />}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
          {isEditMode ? (
            <>
              <Edit3 className="h-7 w-7 text-primary" /> Edit Your Property
            </>
          ) : (
            'Post Your Property'
          )}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isEditMode
            ? 'Update your listing details. Significant changes will require re-approval by our team.'
            : 'Complete all steps to publish your listing. It will be reviewed by our team within 24 hours.'}
        </p>
        {isEditMode && originalStatus && (
          <Badge variant="outline" className="mt-2">
            Current status: {originalStatus}
          </Badge>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-colors ${
                  i < step
                    ? 'bg-primary border-primary text-primary-foreground'
                    : i === step
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-muted-foreground'
                }`}
              >
                {i < step ? <Check className="h-5 w-5" /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="p-6 md:p-8">
        {/* Step 1: Category */}
        {step === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold mb-1">Select Property Type</h2>
              <p className="text-sm text-muted-foreground mb-4">What kind of property are you listing?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PROPERTY_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      type === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <HomeIcon className="h-5 w-5 mb-2 text-primary" />
                    <div className="font-medium text-sm">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-1">Select Category</h2>
              <p className="text-sm text-muted-foreground mb-3">Choose the most relevant category.</p>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
            </div>
            <div className="space-y-2">
              <Label>Listing Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Spacious 3BHK Apartment in Whitefield"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Describe your property — features, amenities, location benefits, nearby landmarks..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground">{description.length}/5000</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Area (sqft) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="1450" value={area} onChange={e => setArea(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input type="number" placeholder="3" value={bedrooms} onChange={e => setBedrooms(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bathrooms</Label>
                <Input type="number" placeholder="2" value={bathrooms} onChange={e => setBathrooms(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Parking</Label>
                <Input type="number" placeholder="1" value={parking} onChange={e => setParking(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Furnishing</Label>
              <Select value={furnishing} onValueChange={setFurnishing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FURNISHING_TYPES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location / Locality <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Whitefield, Palm Meadows" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City <span className="text-destructive">*</span></Label>
                <Input placeholder="Bangalore" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State <span className="text-destructive">*</span></Label>
                <Input placeholder="Karnataka" value={state_} onChange={e => setState_(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input placeholder="560066" value={pincode} onChange={e => setPincode(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input placeholder="12.9698" value={latitude} onChange={e => setLatitude(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input placeholder="77.7499" value={longitude} onChange={e => setLongitude(e.target.value)} />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={detectLocation}>
              <MapPin className="h-4 w-4 mr-1" /> Detect my location
            </Button>
          </div>
        )}

        {/* Step 3: Photos */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold mb-1">Upload Photos</h2>
              <p className="text-sm text-muted-foreground">
                Add up to 10 photos. The first photo will be the cover image. JPG, PNG, WebP up to 5MB each.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 10}
              className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium">Click to upload photos</span>
              <span className="text-xs text-muted-foreground">{images.length}/10 uploaded</span>
            </button>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border">
                    <Image src={img.localPreview || img.url} alt="" fill sizes="200px" className="object-cover" unoptimized />
                    <div className="absolute top-1 left-1">
                      {img.isPrimary ? (
                        <Badge className="bg-primary/90 text-primary-foreground">Cover</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 px-2 text-xs"
                          onClick={() => setPrimary(i)}
                        >
                          Set cover
                        </Button>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/90 hover:bg-white"
                      onClick={() => removeImage(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Pricing */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold mb-1">Set Your Price</h2>
              <p className="text-sm text-muted-foreground">
                Set a competitive price. You can mark it as negotiable to attract more buyers.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Expected Price (₹) <span className="text-destructive">*</span></Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="8500000"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="pl-10"
                />
              </div>
              {price && Number(price) > 0 && (
                <p className="text-sm text-primary font-medium">
                  {formatPrice(Number(price))}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <div className="font-medium">Price Negotiable?</div>
                <div className="text-xs text-muted-foreground">Allow buyers to negotiate the price</div>
              </div>
              <Switch checked={isNegotiable} onCheckedChange={setIsNegotiable} />
            </div>

            <div className="space-y-2">
              <Label>Contact Preference</Label>
              <Select value={contactPref} onValueChange={setContactPref}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_PREFS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                placeholder="+91 98111 00001"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Visible only to users who view your listing.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {isEditMode ? 'Review & Save Changes' : 'Review & Publish'}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
            </div>

            <Card className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReviewItem icon={Tag} label="Type" value={PROPERTY_TYPES.find(t => t.value === type)?.label || '-'} />
                <ReviewItem icon={HomeIcon} label="Category" value={categories.find(c => c.id === categoryId)?.name || '-'} />
                <ReviewItem icon={MapPin} label="Location" value={`${location}, ${city}, ${state_}`} />
                <ReviewItem icon={ImageIcon} label="Photos" value={`${images.length} uploaded`} />
                <ReviewItem icon={IndianRupee} label="Price" value={formatPrice(Number(price) || 0)} />
                <ReviewItem icon={CheckCircle2} label="Negotiable" value={isNegotiable ? 'Yes' : 'No'} />
              </div>
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-1">{title}</div>
              <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
            </Card>

            {isEditMode ? (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
                <strong>Heads up:</strong> If you change the title, description, price, type, category,
                area, or location, your listing will be sent back to our moderation team for re-approval
                (typically under 24 hours). Other fields update immediately.
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Your listing will be reviewed by our moderation team before going
                live. This usually takes less than 24 hours. You&apos;ll be able to edit it from your
                profile once published.
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={loading} size="lg">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Publish Listing'}
            </Button>
          )}
        </div>
      </Card>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {images[0] && (
              <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-muted">
                <Image src={images[0].localPreview || images[0].url} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div>
              <div className="text-2xl font-bold text-primary">{formatPrice(Number(price) || 0)}</div>
              <h3 className="font-bold text-lg mt-1">{title || 'Untitled listing'}</h3>
              <p className="text-sm text-muted-foreground">{location}, {city}, {state_}</p>
            </div>
            <p className="text-sm whitespace-pre-line">{description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReviewItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  )
}
