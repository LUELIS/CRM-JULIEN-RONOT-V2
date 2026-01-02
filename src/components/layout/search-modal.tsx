"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Users, FileText, FileCheck, Loader2, Command } from "lucide-react"

interface SearchResult {
  type: "client" | "invoice" | "quote"
  id: string
  title: string
  subtitle: string
}

const typeConfig = {
  client: {
    icon: Users,
    bg: '#F3E8FF',
    color: '#5F00BA',
    label: "Client"
  },
  invoice: {
    icon: FileText,
    bg: '#E3F2FD',
    color: '#0064FA',
    label: "Facture"
  },
  quote: {
    icon: FileCheck,
    bg: '#FEF3CD',
    color: '#F0783C',
    label: "Devis"
  },
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
        setSelectedIndex(0)
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  const handleSelect = (result: SearchResult) => {
    const paths = {
      client: `/clients/${result.id}`,
      invoice: `/invoices/${result.id}`,
      quote: `/quotes/${result.id}`,
    }
    router.push(paths[result.type])
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[12%] z-50 mx-auto max-w-[600px]">
        <div
          className="rounded-[16px] overflow-hidden"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-4 border-b"
            style={{ borderColor: '#EEEEEE' }}
          >
            <Search className="h-5 w-5" style={{ color: '#0064FA' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher clients, factures, devis..."
              className="flex-1 bg-transparent outline-none text-[15px]"
              style={{ color: '#111111' }}
              autoFocus
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#999999' }} />}
            <kbd
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium"
              style={{ background: '#F5F5F7', color: '#666666' }}
            >
              <Command className="h-3 w-3" />K
            </kbd>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[8px] transition-colors hover:bg-[#F5F5F7]"
            >
              <X className="h-4 w-4" style={{ color: '#999999' }} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto">
            {query.length < 2 ? (
              <div className="px-4 py-10 text-center">
                <Search className="h-8 w-8 mx-auto mb-3" style={{ color: '#CCCCCC' }} />
                <p className="text-sm" style={{ color: '#999999' }}>
                  Tapez au moins 2 caractères pour rechercher
                </p>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="px-4 py-10 text-center">
                <div
                  className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
                  style={{ background: '#F5F5F7' }}
                >
                  <Search className="h-5 w-5" style={{ color: '#999999' }} />
                </div>
                <p className="text-sm" style={{ color: '#666666' }}>
                  Aucun résultat pour "<span style={{ color: '#111111' }}>{query}</span>"
                </p>
                <p className="text-xs mt-1" style={{ color: '#999999' }}>
                  Essayez avec d'autres termes
                </p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => {
                  const config = typeConfig[result.type]
                  const Icon = config.icon
                  const isSelected = index === selectedIndex

                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      style={{
                        background: isSelected ? '#F5F5F7' : 'transparent'
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div
                        className="p-2.5 rounded-[10px] flex-shrink-0"
                        style={{ background: config.bg }}
                      >
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[14px] font-medium truncate"
                          style={{ color: '#111111' }}
                        >
                          {result.title}
                        </p>
                        <p
                          className="text-xs truncate mt-0.5"
                          style={{ color: '#999999' }}
                        >
                          {result.subtitle}
                        </p>
                      </div>
                      <span
                        className="text-[11px] px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: config.bg,
                          color: config.color
                        }}
                      >
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2.5 border-t flex items-center gap-5 text-[11px]"
            style={{ borderColor: '#EEEEEE', background: '#FAFAFA', color: '#999999' }}
          >
            <span className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded-[4px] text-[10px]"
                style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', color: '#666666' }}
              >
                ↑↓
              </kbd>
              <span>naviguer</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded-[4px] text-[10px]"
                style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', color: '#666666' }}
              >
                ↵
              </kbd>
              <span>sélectionner</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd
                className="px-1.5 py-0.5 rounded-[4px] text-[10px]"
                style={{ background: '#FFFFFF', border: '1px solid #DDDDDD', color: '#666666' }}
              >
                esc
              </kbd>
              <span>fermer</span>
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
