"use client"

import { NoteCard } from "./NoteCard"
import { StickyNote, Loader2 } from "lucide-react"

interface Tag {
  id: string
  name: string
  color: string | null
  icon: string | null
  noteCount?: number
}

interface EntityLink {
  id: string
  entityType: string
  entityId: string
  entityName?: string | null
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

interface NoteListProps {
  notes: Note[]
  isLoading?: boolean
  onEdit?: (note: Note) => void
  onDelete?: (noteId: string) => void
  onArchive?: (noteId: string) => void
  onPin?: (noteId: string, pinned: boolean) => void
  onShare?: (noteId: string) => void
  onClick?: (note: Note) => void
  onUpdateContent?: (noteId: string, content: string) => void
  emptyMessage?: string
  columns?: 1 | 2 | 3
}

export function NoteList({
  notes,
  isLoading = false,
  onEdit,
  onDelete,
  onArchive,
  onPin,
  onShare,
  onClick,
  onUpdateContent,
  emptyMessage = "Aucune note",
  columns = 2,
}: NoteListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "#E6F0FF" }}
        >
          <StickyNote className="w-8 h-8" style={{ color: "#0064FA" }} />
        </div>
        <p className="font-medium" style={{ color: "#666666" }}>
          {emptyMessage}
        </p>
        <p className="text-sm mt-1" style={{ color: "#999999" }}>
          Créez votre première note ci-dessus
        </p>
      </div>
    )
  }

  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  }[columns]

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          onPin={onPin}
          onShare={onShare}
          onClick={onClick}
          onUpdateContent={onUpdateContent}
        />
      ))}
    </div>
  )
}
