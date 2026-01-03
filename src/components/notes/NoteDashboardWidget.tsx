"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  StickyNote,
  Zap,
  CheckSquare,
  ArrowRight,
  Loader2,
  Plus,
} from "lucide-react"

interface Note {
  id: string
  content: string
  type: "quick" | "note" | "todo"
  isTop: boolean
  createdAt: string
  author: {
    id: string
    name: string
  }
  tags: { id: string; name: string; color: string | null }[]
}

interface Stats {
  quick: number
  note: number
  todo: number
  total: number
}

const typeConfig = {
  quick: { icon: Zap, label: "Flash", color: "#DCB40A" },
  note: { icon: StickyNote, label: "Note", color: "#0064FA" },
  todo: { icon: CheckSquare, label: "Tâche", color: "#5F00BA" },
}

function truncateContent(content: string, maxLength: number = 80): string {
  const cleaned = content.replace(/^#+\s+/gm, "").replace(/\n+/g, " ")
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength).trim() + "..."
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return "À l'instant"
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Hier"
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function NoteDashboardWidget() {
  const [notes, setNotes] = useState<Note[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch("/api/notes?limit=5")
        const data = await response.json()
        if (response.ok) {
          setNotes(data.notes)
          setStats(data.stats)
        }
      } catch (error) {
        console.error("Error fetching notes:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchNotes()
  }, [])

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        border: "1px solid #EEEEEE",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#EEEEEE" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#E6F0FF" }}
          >
            <StickyNote className="w-5 h-5" style={{ color: "#0064FA" }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "#111111" }}>
              Notes récentes
            </h3>
            <p className="text-xs" style={{ color: "#999999" }}>
              {stats?.total || 0} note{(stats?.total || 0) > 1 ? "s" : ""} au total
            </p>
          </div>
        </div>
        <Link
          href="/notes"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "#F5F5F5", color: "#666666" }}
        >
          Voir tout
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stats Bar */}
      {stats && stats.total > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: "#EEEEEE" }}>
          {Object.entries(typeConfig).map(([type, config]) => {
            const Icon = config.icon
            const count = stats[type as keyof typeof stats] as number
            return (
              <div key={type} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4" style={{ color: config.color }} />
                <span className="text-xs font-medium" style={{ color: "#666666" }}>
                  {count} {config.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Notes List */}
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#0064FA" }} />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "#E6F0FF" }}
            >
              <StickyNote className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "#666666" }}>
              Aucune note
            </p>
            <Link
              href="/notes"
              className="inline-flex items-center gap-1.5 text-xs font-medium mt-2"
              style={{ color: "#0064FA" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Créer une note
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {notes.map((note) => {
              const config = typeConfig[note.type]
              const Icon = config.icon
              return (
                <Link
                  key={note.id}
                  href="/notes"
                  className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-[#F5F5F5]"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${config.color}15` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-snug line-clamp-2"
                      style={{ color: "#333333" }}
                    >
                      {truncateContent(note.content)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {note.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="text-[10px] font-medium"
                          style={{ color: tag.color || "#0064FA" }}
                        >
                          #{tag.name}
                        </span>
                      ))}
                      <span className="text-[10px]" style={{ color: "#BBBBBB" }}>
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
