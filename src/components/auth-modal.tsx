'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Loader2, Mail, Phone, Lock, User as UserIcon } from 'lucide-react'
import { useApp } from '@/lib/store'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { ForgotPasswordModal } from '@/components/forgot-password-modal'

type Mode = 'login' | 'signup'
type Step = 'form' | 'otp'

export function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal, setUser, fetchUser } = useApp()
  const [mode, setMode] = useState<Mode>(authModalMode)
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [otpPreview, setOtpPreview] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)

  // sync mode when modal mode changes
  const syncMode = (next: Mode) => {
    setMode(next)
    setStep('form')
    setOtp('')
    setOtpPreview(null)
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal()
      // reset state after a brief delay
      setTimeout(() => {
        setStep('form')
        setOtp('')
        setOtpPreview(null)
        setName('')
        setEmail('')
        setPhone('')
        setPassword('')
        setUserId(null)
      }, 200)
    }
  }

  const submitForm = async () => {
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name || !email || !password) {
          toast.error('Please fill in all required fields')
          return
        }
        const res = await apiPost<{ otpPreview: string; userId: string; message: string }>(
          '/api/auth/signup',
          { name, email, phone: phone || undefined, password },
        )
        setOtpPreview(res.otpPreview)
        setUserId(res.userId)
        setStep('otp')
        toast.success(res.message)
        if (res.otpPreview) {
          toast.info(`Demo OTP: ${res.otpPreview}`, { duration: 8000 })
        }
      } else {
        if (!email || !password) {
          toast.error('Please enter email and password')
          return
        }
        const res = await apiPost<{ requiresOtp?: boolean; otpPreview?: string; userId?: string; user?: any; message: string }>(
          '/api/auth/login',
          { email, password },
        )
        if (res.requiresOtp) {
          setOtpPreview(res.otpPreview || null)
          setUserId(res.userId || null)
          setStep('otp')
          toast.info(res.message)
          if (res.otpPreview) {
            toast.info(`Demo OTP: ${res.otpPreview}`, { duration: 8000 })
          }
        } else if (res.user) {
          setUser(res.user)
          closeAuthModal()
          toast.success('Welcome back, ' + res.user.name + '!')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit code')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<{ user: any; message: string }>('/api/auth/verify-otp', {
        identifier: email,
        code: otp,
        purpose: mode === 'signup' ? 'SIGNUP' : 'LOGIN',
        userId: userId || undefined,
      })
      setUser(res.user)
      closeAuthModal()
      toast.success(res.message)
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setLoading(true)
    try {
      const res = await apiPost<{ otpPreview: string }>('/api/auth/send-otp', {
        identifier: email,
        purpose: mode === 'signup' ? 'SIGNUP' : 'LOGIN',
      })
      setOtpPreview(res.otpPreview)
      toast.success('OTP re-sent')
      if (res.otpPreview) {
        toast.info(`Demo OTP: ${res.otpPreview}`, { duration: 8000 })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <Dialog open={authModalOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'otp'
              ? 'Verify your account'
              : mode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
          </DialogTitle>
          <DialogDescription>
            {step === 'otp'
              ? `We sent a 6-digit code to ${email}. Enter it below to continue.`
              : mode === 'login'
                ? 'Sign in to manage your listings, chats and favorites.'
                : 'Join thousands of property buyers and sellers.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4 pt-2">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="auth-name">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="auth-name"
                    placeholder="Rahul Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="pl-10"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="auth-phone">Phone (optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="auth-phone"
                    placeholder="+91 98111 00001"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="pl-10"
                    autoComplete="tel"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  onKeyDown={e => e.key === 'Enter' && submitForm()}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      closeAuthModal()
                      setTimeout(() => setForgotOpen(true), 200)
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </div>

            <Button onClick={submitForm} disabled={loading} className="w-full" size="lg">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => syncMode(mode === 'login' ? 'signup' : 'login')}
                className="text-primary font-medium hover:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Enter OTP</Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={v => setOtp(v)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {otpPreview && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm">
                <span className="text-amber-800 dark:text-amber-200">
                  <strong>Demo OTP:</strong> {otpPreview}
                  <br />
                  <span className="text-xs">
                    (In production this would be sent via email/SMS)
                  </span>
                </span>
              </div>
            )}

            <Button onClick={verifyOtp} disabled={loading} className="w-full" size="lg">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Continue
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={resendOtp}
                disabled={loading}
                className="text-primary font-medium hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </>
  )
}
