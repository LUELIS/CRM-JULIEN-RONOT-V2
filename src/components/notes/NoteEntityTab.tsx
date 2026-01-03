"use client"

import { useEffect, useState, useCallback } from "react"
import { NoteQuickAdd } from "./NoteQuickAdd"
import { NoteCard } from "./NoteCard"
import { StickyNote, Loader2 } from "lucide-react"

interface Tag {
  id: string
  name: string
  color: string | null
  icon: string | null
}

interface EntityLink {
  id: string
  entityType: string
  entityId: string
}

interface Note {
  id: string
  content: string
  type: "quick" | "note" | "todo"
  isTop: boolean
  isArchived: boolean
  isShare: boolean
  shareToken: string | null
  reminderAt: string | null
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
  }
  tags: Tag[]
  entityLinks: EntityLink[]
  attachmentCount: number
  commentCount: number
}

interface NoteEntityTabProps {
  entityType: "client" | "invoice" | "quote" | "subscription" | "ticket" | "contract" | "domain"
  entityId: string
  entityName?: string
}

const entityTypeLabels: Record<string, string> = {
  client: "ce client",
  invoice: "cette facture",
  quote: "ce devis",
  subscription: "cet abonnement",
  ticket: "ce ticket",
  contract: "ce contrat",
  domain: "ce domaine",
}

export function NoteEntityTab({ entityType, entityId, entityName }: NoteEntityTabProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/notes/entity/${entityType}/${entityId}`)
      const data = await response.json()
      if (response.ok) {
        setNotes(data.notes)
      }
    } catch (error) {
      console.error("Error fetching notes:", error)
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/notes/tags")
      const data = await response.json()
      if (response.ok) {
        setTags(data.tags)
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    }
  }, [])

  useEffect(() => {
    fetchNotes()
    fetchTags()
  }, [fetchNotes, fetchTags])

  const handleCreateNote = async (data: {
    content: string
    type: "quick" | "note" | "todo"
    tagIds: string[]
    entityLinks: { entityType: string; entityId: string }[]
    reminderAt: string | null
  }) => {
    // Always include the current entity link
    const entityLinks = [
      { entityType, entityId },
      ...data.entityLinks.filter(
        (l) => !(l.entityType === entityType && l.entityId === entityId)
      ),
    ]

    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, entityLinks }),
    })

    if (response.ok) {
      fetchNotes()
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "DELETE",
    })

    if (response.ok) {
      fetchNotes()
    }
  }

  const handleArchiveNote = async (noteId: string) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: true }),
    })

    if (response.ok) {
      fetchNotes()
    }
  }

  const handlePinNote = async (noteId: string, pinned: boolean) => {
    const response = await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTop: pinned }),
    })

    if (response.ok) {
      fetchNotes()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Add */}
      <NoteQuickAdd
        onSubmit={handleCreateNote}
        tags={tags}
        defaultEntityLink={{ entityType, entityId, entityName }}
        placeholder={`Ajouter une note pour ${entityTypeLabels[entityType]}...`}
      />

      {/* Notes List */}
      {notes.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            border: "1px solid #EEEEEE",
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#E6F0FF" }}
          >
            <StickyNote className="w-8 h-8" style={{ color: "#0064FA" }} />
          </div>
          <p className="font-medium" style={{ color: "#666666" }}>
            Aucune note pour {entityTypeLabels[entityType]}
          </p>
          <p className="text-sm mt-2" style={{ color: "#999999" }}>
            Utilisez le formulaire ci-dessus pour créer une note
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={handleDeleteNote}
              onArchive={handleArchiveNote}
              onPin={handlePinNote}
            />
          ))}
        </div>
      )}
    </div>
  )
}
