'use client'

import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, GitCompare, Trash2 } from 'lucide-react'

export function CompareTray() {
  const { compareIds, clearCompare, navigate, view } = useApp()

  // Hide on compare page itself
  if (view.name === 'compare' || compareIds.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in w-[calc(100%-2rem)] max-w-2xl">
      <div className="bg-card border border-border shadow-xl rounded-xl p-3 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
            <GitCompare className="h-5 w-5 text-primary" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium leading-tight">Compare Tray</div>
            <div className="text-xs text-muted-foreground">{compareIds.length}/4 selected</div>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {compareIds.length === 0 ? (
            <span className="text-sm text-muted-foreground">Click the compare icon on any property</span>
          ) : (
            <Badge variant="outline" className="shrink-0">
              {compareIds.length} propert{compareIds.length === 1 ? 'y' : 'ies'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearCompare}
            aria-label="Clear comparison"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            disabled={compareIds.length < 2}
            onClick={() => navigate({ name: 'compare', ids: compareIds })}
          >
            <GitCompare className="h-4 w-4 mr-1" />
            Compare ({compareIds.length})
          </Button>
        </div>
      </div>
    </div>
  )
}
