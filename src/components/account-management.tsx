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
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Trash2,
  Shield,
  AlertTriangle,
  Loader2,
  Lock,
  FileJson,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'

export function AccountManagement() {
  const { user, navigate, setUser } = useApp()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/account/export', { credentials: 'include' })
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `estatebazaar-data-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Your data has been exported')
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Type DELETE to confirm')
      return
    }
    if (!password) {
      toast.error('Password is required')
      return
    }
    setLoading(true)
    try {
      await api('/api/account/delete', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast.success('Your account has been deleted')
      setUser(null)
      navigate({ name: 'home' })
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 md:col-span-3 border-red-200 dark:border-red-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-500" />
          Account Management
        </h3>
        <Badge variant="outline" className="text-xs">Privacy & Data</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export data */}
        <div className="p-4 rounded-lg border">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileJson className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Export My Data</div>
              <div className="text-xs text-muted-foreground mt-0.5 mb-3">
                Download all your data (profile, listings, chats, payments, etc.) as a JSON file.
                Required for GDPR data portability compliance.
              </div>
              <Button size="sm" variant="outline" onClick={exportData} disabled={exporting}>
                {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                Download Data
              </Button>
            </div>
          </div>
        </div>

        {/* Delete account */}
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Delete Account</div>
              <div className="text-xs text-muted-foreground mt-0.5 mb-3">
                Permanently delete your account and all associated data. This action{' '}
                <strong>cannot be undone</strong>. All your listings, chats, favorites, and payments
                will be removed.
              </div>
              <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete My Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Dialog open={deleteOpen} onOpenChange={o => !o && setDeleteOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your account, listings, chats, favorites, payments, and all
              associated data. <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
              <div className="font-medium mb-1">You will lose:</div>
              <ul className="text-xs space-y-0.5 list-disc list-inside">
                <li>All property listings and their images</li>
                <li>All chat conversations</li>
                <li>All favorites and saved searches</li>
                <li>All payment history and subscriptions</li>
                <li>Your profile and verification status</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-text">Type <strong>DELETE</strong> to confirm</Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="text-center font-bold uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="del-password" className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Your Password
              </Label>
              <Input
                id="del-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password to confirm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setPassword(''); setConfirmText('') }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteAccount}
              disabled={loading || confirmText !== 'DELETE' || !password}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
