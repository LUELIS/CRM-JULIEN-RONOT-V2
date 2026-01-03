"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  StickyNote,
  Zap,
  CheckSquare,
  Plus,
  ArrowRight,
  Loader2,
  Pin,
} from "lucide-react"

interface Note {
  id: string
  content: string
  type: "quick" | "note" | "todo"
  isTop: boolean
  createdAt: string
  tags: { id: string; name: string; color: string | null }[]
}

interface NotesSidebarCardProps {
  entityType: string
  entityId: string
}

const typeConfig = {
  quick: { icon: Zap, label: "Flash", color: "#DCB40A" },
  note: { icon: StickyNote, label: "Note", color: "#0064FA" },
  todo: { icon: CheckSquare, label: "Tache", color: "#5F00BA" },
}

function truncateContent(content: string, maxLength: number = 60): string {
  const cleaned = content.replace(/^#+\s+/gm, "").replace(/\n+/g, " ")
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength).trim() + "..."
}

export function NotesSidebarCard({ entityType, entityId }: NotesSidebarCardProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState("")

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/notes/entity/${entityType}/${entityId}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes.slice(0, 5))
      }
    } catch (error) {
      console.error("Error fetching notes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [entityType, entityId])

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return

    setIsAdding(true)
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNoteContent,
          type: "quick",
          entityLinks: [{ entityType, entityId }],
        }),
      })

      if (response.ok) {
        setNewNoteContent("")
        fetchNotes()
      }
    } catch (error) {
      console.error("Error adding note:", error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4" style={{ color: "#0064FA" }} />
          <h3 className="font-semibold" style={{ color: "#111111" }}>
            Notes
          </h3>
          <span
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ background: "#E6F0FF", color: "#0064FA" }}
          >
            {notes.length}
          </span>
        </div>
        <Link
          href="/notes"
          className="text-xs font-medium flex items-center gap-1 hover:underline"
          style={{ color: "#0064FA" }}
        >
          Voir tout
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Quick add */}
      <div className="px-5 py-3" style={{ borderBottom: "1px solid #EEEEEE" }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Ajouter une note rapide..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "#F5F5F7", color: "#111111" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleAddNote()
              }
            }}
          />
          <button
            onClick={handleAddNote}
            disabled={isAdding || !newNoteContent.trim()}
            className="px-3 py-2 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "#0064FA", color: "#FFFFFF" }}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#0064FA" }} />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm" style={{ color: "#999999" }}>
              Aucune note
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => {
              const config = typeConfig[note.type]
              const Icon = config.icon
              return (
                <Link
                  key={note.id}
                  href="/notes"
                  className="flex items-start gap-2 p-2 rounded-lg transition-colors hover:bg-[#F5F5F5]"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${config.color}15` }}
                  >
                    <Icon className="w-3 h-3" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-tight line-clamp-2"
                      style={{ color: "#333333" }}
                    >
                      {truncateContent(note.content)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {note.isTop && (
                        <Pin className="w-3 h-3" style={{ color: "#F04B69" }} />
                      )}
                      {note.tags.slice(0, 1).map((tag) => (
                        <span
                          key={tag.id}
                          className="text-[10px] font-medium"
                          style={{ color: tag.color || "#0064FA" }}
                        >
                          #{tag.name}
                        </span>
                      ))}
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
