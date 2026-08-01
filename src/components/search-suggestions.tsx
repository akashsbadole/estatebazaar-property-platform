'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Search, Clock, X, MapPin } from 'lucide-react'
import { useApp } from '@/lib/store'
import { apiGet, apiPost } from '@/lib/api-client'
import type { PropertyWithRelations } from '@/lib/constants'

interface SuggestionItem {
  id: string
  title: string
  location: string
  city: string
  type: string
  price: number
  image?: string | null
}

interface RecentItem {
  q: string
  timestamp: number
}

interface SuggestionsResponse {
  suggestions: SuggestionItem[]
  recent: RecentItem[]
}

const COOKIE_NAME = 'eb_recent_searches'

function parseRecentFromCookie(): RecentItem[] {
  if (typeof document === 'undefined') return []
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  if (!match) return []
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]))
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r: any) => r && typeof r.q === 'string').slice(0, 8)
  } catch {
    return []
  }
}

async function persistSearch(q: string) {
  try {
    await apiPost('/api/search/suggestions', { q })
  } catch {
    // silent
  }
}

interface Props {
  value: string
  onChange: (v: string) => void
  onSelect: (q: string) => void
  placeholder?: string
  inputClassName?: string
}

export function SearchSuggestions({ value, onChange, onSelect, placeholder, inputClassName }: Props) {
  const { navigate } = useApp()
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const recent = useMemo(() => (open ? parseRecentFromCookie() : []), [open])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSuggestions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setActiveIdx(-1)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiGet<SuggestionsResponse>(`/api/search/suggestions?q=${encodeURIComponent(value.trim())}`)
        setSuggestions(res.suggestions)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value])

  const handleSelect = useCallback((q: string) => {
    onChange('')
    setOpen(false)
    onSelect(q)
    persistSearch(q)
  }, [onChange, onSelect])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = value.trim() ? suggestions : recent
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < items.length) {
        const item = items[activeIdx]
        handleSelect('q' in item ? item.q : item.title)
      } else if (value.trim()) {
        handleSelect(value.trim())
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const allItems = value.trim() ? suggestions : recent
  const showRecent = !value.trim() && recent.length > 0

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Search by location, city, or property name...'}
          className={`pl-10 pr-10 h-10 w-full rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 ${inputClassName || ''}`}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setSuggestions([]); inputRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (showRecent || suggestions.length > 0 || loading) && (
        <div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-lg shadow-lg overflow-hidden animate-fade-in" role="listbox">
          {showRecent && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Recent Searches
              </div>
              {recent.map((r, i) => (
                <button
                  key={r.q + r.timestamp}
                  role="option"
                  aria-selected={activeIdx === i}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => handleSelect(r.q)}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{r.q}</span>
                </button>
              ))}
            </div>
          )}
          {value.trim() && suggestions.length > 0 && (
            <div className="py-1">
              {showRecent && <div className="border-t" />}
              {suggestions.map((s, i) => {
                const idx = showRecent ? recent.length + i : i
                return (
                  <button
                    key={s.id}
                    role="option"
                    aria-selected={activeIdx === idx}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 text-left"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => handleSelect(s.title)}
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {s.location}, {s.city}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">₹{s.price.toLocaleString('en-IN')}</span>
                  </button>
                )
              })}
            </div>
          )}
          {loading && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">Searching...</div>
          )}
          {value.trim() && !loading && suggestions.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              Press Enter to search &quot;{value.trim()}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
