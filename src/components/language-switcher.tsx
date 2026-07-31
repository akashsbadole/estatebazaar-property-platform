'use client'

import { useI18n } from '@/lib/i18n-context'
import { LANGUAGES, type Lang } from '@/lib/i18n-dictionary'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Globe, Check } from 'lucide-react'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n()
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'sm'}
          className="gap-1.5"
          aria-label="Change language"
          title={`Language: ${current.nativeLabel}`}
        >
          <Globe className={compact ? 'h-4 w-4' : 'h-4 w-4'} />
          {!compact && (
            <span className="text-sm font-medium">{current.nativeLabel}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Select Language / భాష ఎంచుకోండి
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map(l => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code as Lang)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{l.flag}</span>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{l.nativeLabel}</span>
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            </div>
            {l.code === lang && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
