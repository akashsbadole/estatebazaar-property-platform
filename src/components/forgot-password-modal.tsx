'use client'

import { useState } from 'react'
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Loader2, Mail, KeyRound, CheckCircle2 } from 'lucide-react'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
}

type Step = 'email' | 'otp' | 'success'

export function ForgotPasswordModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [otpPreview, setOtpPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    setNewPassword('')
    setOtpPreview(null)
  }

  const handleClose = () => {
    onClose()
    setTimeout(reset, 200)
  }

  const sendOtp = async () => {
    if (!email) {
      toast.error('Please enter your email')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<{ message: string; otpPreview?: string }>('/api/auth/forgot-password', {
        step: 'send',
        email,
      })
      setOtpPreview(res.otpPreview || null)
      setStep('otp')
      toast.success(res.message)
      if (res.otpPreview) {
        toast.info(`Demo OTP: ${res.otpPreview}`, { duration: 8000 })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async () => {
    if (otp.length !== 6) {
      toast.error('Enter the 6-digit OTP')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<{ message: string }>('/api/auth/forgot-password', {
        step: 'reset',
        email,
        code: otp,
        newPassword,
      })
      toast.success(res.message)
      setStep('success')
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {step === 'email' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Forgot Password
              </DialogTitle>
              <DialogDescription>
                Enter your registered email and we&apos;ll send you a one-time password to reset your password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={sendOtp} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'otp' && (
          <>
            <DialogHeader>
              <DialogTitle>Reset Your Password</DialogTitle>
              <DialogDescription>
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below along with your new password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Enter OTP</Label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
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
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                  <strong>Demo OTP:</strong> {otpPreview}
                  <div className="text-xs mt-0.5">(In production this would be sent via email/SMS)</div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('email')}>← Back</Button>
              <Button onClick={resetPassword} disabled={loading} className="flex-1">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
                Password Reset!
              </DialogTitle>
              <DialogDescription>
                Your password has been successfully reset. You can now log in with your new password.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 flex flex-col items-center text-center gap-3">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full">Continue to Login</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
