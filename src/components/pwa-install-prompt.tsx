'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X, RefreshCw } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          setRegistration(reg)
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                }
              })
            }
          })
        })
        .catch(err => console.warn('[pwa] SW registration failed:', err))
    }

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt only if user hasn't dismissed it before
      const dismissed = sessionStorage.getItem('pwa-prompt-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 5000) // Show after 5s
      }
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Track if installed
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
      console.log('[pwa] App installed')
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      console.log('[pwa] User accepted install')
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const dismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem('pwa-prompt-dismissed', '1')
  }

  const applyUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage('SKIP_WAITING')
    }
    window.location.reload()
  }

  return (
    <>
      {/* Install prompt banner */}
      {showPrompt && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
          <div className="bg-card border shadow-xl rounded-xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Install EstateBazaar</div>
              <div className="text-xs text-muted-foreground">
                Add to your home screen for a faster, app-like experience.
              </div>
            </div>
            <Button size="sm" onClick={install} className="shrink-0">
              Install
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={dismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Update available banner */}
      {updateAvailable && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-primary text-primary-foreground shadow-xl rounded-full px-4 py-2 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm font-medium">A new version is available</span>
            <Button size="sm" variant="secondary" className="ml-2 h-7" onClick={applyUpdate}>
              Update
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
