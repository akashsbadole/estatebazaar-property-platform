'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Send, CheckCircle2, Mail, Phone, MessageSquare } from 'lucide-react'
import { useApp } from '@/lib/store'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  /** When set, prefilled as an enquiry about this property */
  propertyId?: string
  propertyTitle?: string
}

export function ContactUsModal({ open, onClose, propertyId, propertyTitle }: Props) {
  const { user } = useApp()
  const [type, setType] = useState<'ENQUIRY' | 'SUPPORT'>('ENQUIRY')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Pre-fill from logged-in user
  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPhone(user.phone || '')
    }
  }, [user])

  // Reset success state when modal reopens
  useEffect(() => {
    if (open) {
      setSuccess(false)
      if (propertyId) {
        setType('ENQUIRY')
        setMessage(`Hi, I'm interested in "${propertyTitle}". Please connect me with the owner.`)
      }
    }
  }, [open, propertyId, propertyTitle])

  const submit = async () => {
    if (!name || !email || !message) {
      toast.error('Please fill in name, email, and message')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost('/api/contact', {
        type,
        name,
        email,
        phone: phone || undefined,
        message,
        propertyId: type === 'ENQUIRY' ? propertyId : undefined,
      })
      setSuccess(true)
      toast.success(res.message)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                {propertyId ? 'Enquire about this property' : 'Contact Us'}
              </DialogTitle>
              <DialogDescription>
                {propertyId
                  ? 'Our team will connect you with the property owner within 24 hours.'
                  : 'Have a question? Send us a message and we\'ll get back to you within 24 hours.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {!propertyId && (
                <div className="space-y-2">
                  <Label>Type of enquiry</Label>
                  <Select value={type} onValueChange={v => setType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENQUIRY">Property enquiry</SelectItem>
                      <SelectItem value="SUPPORT">General support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Name *</Label>
                  <Input id="c-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-phone">Phone</Label>
                  <Input id="c-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98111 00001" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-email">Email *</Label>
                <Input id="c-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="c-message">Message *</Label>
                <Textarea
                  id="c-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell us what you're looking for..."
                  maxLength={3000}
                />
              </div>

              {propertyId && (
                <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span>Enquiring about: <span className="font-medium text-foreground">{propertyTitle}</span></span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4 mr-1" /> Submit
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
                Message Sent!
              </DialogTitle>
              <DialogDescription>
                Thanks for reaching out. Our team will contact you within 24 hours.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 flex flex-col items-center text-center gap-3">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                We&apos;ve received your message and will get back to you at <strong>{email}</strong>
                {phone && <> or <strong>{phone}</strong></>}.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={onClose} className="w-full">Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
