"use client"

import { useState } from "react"
import {
  Zap,
  StickyNote,
  CheckSquare,
  Pin,
  MoreHorizontal,
  Paperclip,
  MessageCircle,
  Calendar,
  Trash2,
  Archive,
  Share2,
  Edit3,
  ExternalLink,
  Building2,
  Receipt,
  FileText,
  CreditCard,
  Globe,
  Ticket,
  FileSignature,
} from "lucide-react"
import { MarkdownPreview } from "./MarkdownPreview"

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

interface NoteCardProps {
  note: Note
  onEdit?: (note: Note) => void
  onDelete?: (noteId: string) => void
  onArchive?: (noteId: string) => void
  onPin?: (noteId: string, pinned: boolean) => void
  onShare?: (noteId: string) => void
  onClick?: (note: Note) => void
  onUpdateContent?: (noteId: string, content: string) => void
}

const typeConfig = {
  quick: {
    icon: Zap,
    label: "Flash",
    color: "#DCB40A",
    bgColor: "#FFF9E6",
  },
  note: {
    icon: StickyNote,
    label: "Note",
    color: "#0064FA",
    bgColor: "#E6F0FF",
  },
  todo: {
    icon: CheckSquare,
    label: "Tâche",
    color: "#5F00BA",
    bgColor: "#F3E8FF",
  },
}

const entityTypeConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  client: { label: "Client", icon: Building2, color: "#0064FA" },
  invoice: { label: "Facture", icon: Receipt, color: "#28B95F" },
  quote: { label: "Devis", icon: FileText, color: "#5F00BA" },
  subscription: { label: "Abonnement", icon: CreditCard, color: "#F0783C" },
  ticket: { label: "Ticket", icon: Ticket, color: "#F04B69" },
  contract: { label: "Contrat", icon: FileSignature, color: "#DCB40A" },
  domain: { label: "Domaine", icon: Globe, color: "#00B4D8" },
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  } else if (days === 1) {
    return "Hier"
  } else if (days < 7) {
    return `Il y a ${days} jours`
  } else {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }
}


export function NoteCard({
  note,
  onEdit,
  onDelete,
  onArchive,
  onPin,
  onShare,
  onClick,
  onUpdateContent,
}: NoteCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const config = typeConfig[note.type]
  const TypeIcon = config.icon

  const handleTaskToggle = (taskIndex: number, checked: boolean) => {
    const lines = note.content.split("\n")
    let currentTaskIndex = 0

    const newLines = lines.map(line => {
      const uncheckedMatch = line.match(/^- \[ \] (.+)$/)
      const checkedMatch = line.match(/^- \[x\] (.+)$/i)

      if (uncheckedMatch || checkedMatch) {
        if (currentTaskIndex === taskIndex) {
          currentTaskIndex++
          const taskContent = uncheckedMatch ? uncheckedMatch[1] : checkedMatch![1]
          return checked ? `- [x] ${taskContent}` : `- [ ] ${taskContent}`
        }
        currentTaskIndex++
      }
      return line
    })

    const newContent = newLines.join("\n")
    onUpdateContent?.(note.id, newContent)
  }

  return (
    <div
      className="group rounded-2xl p-4 transition-all hover:translate-y-[-2px] cursor-pointer relative"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        border: note.isTop ? `2px solid ${config.color}` : "1px solid #EEEEEE",
      }}
      onClick={() => onClick?.(note)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {/* Type Badge */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
            style={{ background: config.bgColor, color: config.color }}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            {config.label}
          </div>

          {/* Pinned indicator */}
          {note.isTop && (
            <Pin className="w-4 h-4" style={{ color: config.color }} />
          )}

          {/* Shared indicator */}
          {note.isShare && (
            <Share2 className="w-4 h-4" style={{ color: "#28B95F" }} />
          )}
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "#F5F5F5" }}
          >
            <MoreHorizontal className="w-4 h-4" style={{ color: "#666666" }} />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                }}
              />
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-xl py-1 min-w-[160px]"
                style={{
                  background: "#FFFFFF",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  border: "1px solid #EEEEEE",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onEdit?.(note)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#F5F5F5] transition-colors"
                  style={{ color: "#333333" }}
                >
                  <Edit3 className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onPin?.(note.id, !note.isTop)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#F5F5F5] transition-colors"
                  style={{ color: "#333333" }}
                >
                  <Pin className="w-4 h-4" />
                  {note.isTop ? "Désépingler" : "Épingler"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onShare?.(note.id)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#F5F5F5] transition-colors"
                  style={{ color: "#333333" }}
                >
                  <Share2 className="w-4 h-4" />
                  Partager
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onArchive?.(note.id)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#F5F5F5] transition-colors"
                  style={{ color: "#333333" }}
                >
                  <Archive className="w-4 h-4" />
                  Archiver
                </button>
                <div className="h-px my-1" style={{ background: "#EEEEEE" }} />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onDelete?.(note.id)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#FEE2E8] transition-colors"
                  style={{ color: "#F04B69" }}
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <div className="text-sm leading-relaxed mb-3" style={{ color: "#333333" }}>
        <MarkdownPreview
          content={note.content}
          maxLength={250}
          interactive={!!onUpdateContent}
          onTaskToggle={handleTaskToggle}
        />
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {note.tags.map((tag) => (
            <span
              key={tag.id}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: `${tag.color || "#0064FA"}15`,
                color: tag.color || "#0064FA",
              }}
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Entity Links */}
      {note.entityLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {note.entityLinks.map((link) => {
            const config = entityTypeConfig[link.entityType]
            const Icon = config?.icon || ExternalLink
            return (
              <span
                key={link.id}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium"
                style={{
                  background: `${config?.color || "#666666"}15`,
                  color: config?.color || "#666666"
                }}
              >
                <Icon className="w-3 h-3" />
                {link.entityName || `${config?.label || link.entityType} #${link.entityId}`}
              </span>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "#EEEEEE" }}>
        <div className="flex items-center gap-3">
          {/* Attachments */}
          {note.attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#999999" }}>
              <Paperclip className="w-3.5 h-3.5" />
              {note.attachmentCount}
            </span>
          )}

          {/* Comments */}
          {note.commentCount > 0 && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#999999" }}>
              <MessageCircle className="w-3.5 h-3.5" />
              {note.commentCount}
            </span>
          )}

          {/* Reminder */}
          {note.reminderAt && (
            <span className="flex items-center gap-1 text-xs" style={{ color: "#DCB40A" }}>
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(note.reminderAt)}
            </span>
          )}
        </div>

        {/* Date & Author */}
        <div className="flex items-center gap-2 text-xs" style={{ color: "#999999" }}>
          <span>{note.author.name}</span>
          <span>·</span>
          <span>{formatDate(note.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}
