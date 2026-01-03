"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  X,
  Zap,
  StickyNote,
  CheckSquare,
  Bold,
  Italic,
  Heading2,
  Quote,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  Paperclip,
  Plus,
  Building2,
  Receipt,
  FileText,
  CreditCard,
  Globe,
  Ticket,
  FileSignature,
  Trash2,
  Loader2,
  Calendar,
  Clock,
} from "lucide-react"
import { MarkdownPreview } from "./MarkdownPreview"
import { TaskTextarea } from "./TaskTextarea"

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

interface NoteEditModalProps {
  note: Note
  tags: Tag[]
  onSave: (noteId: string, data: {
    content: string
    type: "quick" | "note" | "todo"
    tagIds: string[]
    entityLinks: { entityType: string; entityId: string }[]
    reminderAt: string | null
  }) => Promise<void>
  onClose: () => void
}

const typeOptions = [
  { type: "quick" as const, icon: Zap, label: "Flash", color: "#DCB40A", bgColor: "#FFF9E6" },
  { type: "note" as const, icon: StickyNote, label: "Note", color: "#0064FA", bgColor: "#E6F0FF" },
  { type: "todo" as const, icon: CheckSquare, label: "Tâche", color: "#5F00BA", bgColor: "#F3E8FF" },
]

const toolbarButtons = [
  { icon: Bold, label: "Gras", action: "bold", prefix: "**", suffix: "**" },
  { icon: Italic, label: "Italique", action: "italic", prefix: "_", suffix: "_" },
  { icon: Heading2, label: "Titre", action: "heading", blockPrefix: "## " },
  { icon: Quote, label: "Citation", action: "quote", blockPrefix: "> " },
  { icon: Code, label: "Code", action: "code", prefix: "`", suffix: "`" },
  { icon: LinkIcon, label: "Lien", action: "link", prefix: "[", suffix: "](url)" },
  { icon: List, label: "Liste", action: "ul", blockPrefix: "- " },
  { icon: ListOrdered, label: "Liste numérotée", action: "ol", blockPrefix: "1. " },
  { icon: ListTodo, label: "Tâche", action: "task", blockPrefix: "- [ ] " },
]

const entityTypes = [
  { type: "client", label: "Client", icon: Building2, color: "#0064FA" },
  { type: "invoice", label: "Facture", icon: Receipt, color: "#28B95F" },
  { type: "quote", label: "Devis", icon: FileText, color: "#5F00BA" },
  { type: "subscription", label: "Abonnement", icon: CreditCard, color: "#F0783C" },
  { type: "domain", label: "Domaine", icon: Globe, color: "#00B4D8" },
  { type: "ticket", label: "Ticket", icon: Ticket, color: "#F04B69" },
  { type: "contract", label: "Contrat", icon: FileSignature, color: "#DCB40A" },
]

export function NoteEditModal({ note, tags, onSave, onClose }: NoteEditModalProps) {
  const [content, setContent] = useState(note.content)
  const [noteType, setNoteType] = useState<"quick" | "note" | "todo">(note.type)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(note.tags.map(t => t.id))
  const [entityLinks, setEntityLinks] = useState<{ entityType: string; entityId: string; entityName?: string | null }[]>(
    note.entityLinks.map(l => ({ entityType: l.entityType, entityId: l.entityId, entityName: l.entityName }))
  )
  const [reminderAt, setReminderAt] = useState<string>(
    note.reminderAt ? new Date(note.reminderAt).toISOString().slice(0, 16) : ""
  )
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [showEntitySelector, setShowEntitySelector] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null)
  const [entitySearchQuery, setEntitySearchQuery] = useState("")
  const [entitySearchResults, setEntitySearchResults] = useState<{ id: string; label: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleToolbarAction = useCallback((button: typeof toolbarButtons[0]) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)

    if (button.blockPrefix) {
      const lineStart = content.lastIndexOf("\n", start - 1) + 1
      const beforeLine = content.substring(0, lineStart)
      const afterStart = content.substring(lineStart)
      setContent(beforeLine + button.blockPrefix + afterStart)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(
          lineStart + button.blockPrefix.length,
          lineStart + button.blockPrefix.length
        )
      }, 0)
    } else if (button.prefix && button.suffix) {
      const newText = button.prefix + (selectedText || "texte") + button.suffix
      setContent(content.substring(0, start) + newText + content.substring(end))
      setTimeout(() => {
        textarea.focus()
        if (selectedText) {
          textarea.setSelectionRange(start, start + newText.length)
        } else {
          textarea.setSelectionRange(start + button.prefix.length, start + button.prefix.length + 5)
        }
      }, 0)
    }
  }, [content])

  const searchEntities = useCallback(async (type: string, query: string) => {
    if (!query.trim()) {
      setEntitySearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const endpoints: Record<string, string> = {
        client: "/api/clients",
        invoice: "/api/invoices",
        quote: "/api/quotes",
        subscription: "/api/subscriptions",
        domain: "/api/domains",
        ticket: "/api/tickets",
        contract: "/api/contracts",
      }

      const response = await fetch(`${endpoints[type]}?search=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()

      const items = data.clients || data.invoices || data.quotes || data.subscriptions ||
                    data.domains || data.tickets || data.contracts || []

      setEntitySearchResults(
        items.map((item: { id: string | number; name?: string; company_name?: string; invoice_number?: string; quote_number?: string; domain_name?: string; subject?: string }) => ({
          id: item.id.toString(),
          label: item.name || item.company_name || item.invoice_number || item.quote_number || item.domain_name || item.subject || `#${item.id}`,
        }))
      )
    } catch (error) {
      console.error("Search error:", error)
      setEntitySearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEntityType && entitySearchQuery) {
      const timer = setTimeout(() => {
        searchEntities(selectedEntityType, entitySearchQuery)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedEntityType, entitySearchQuery, searchEntities])

  const handleAddEntityLink = (entityId: string, entityName: string) => {
    if (selectedEntityType && !entityLinks.some(l => l.entityType === selectedEntityType && l.entityId === entityId)) {
      setEntityLinks([...entityLinks, { entityType: selectedEntityType, entityId, entityName }])
    }
    setSelectedEntityType(null)
    setEntitySearchQuery("")
    setEntitySearchResults([])
    setShowEntitySelector(false)
  }

  const handleRemoveEntityLink = (entityType: string, entityId: string) => {
    setEntityLinks(entityLinks.filter(l => !(l.entityType === entityType && l.entityId === entityId)))
  }

  const handleSave = async () => {
    if (!content.trim()) return

    setIsSaving(true)
    try {
      await onSave(note.id, {
        content,
        type: noteType,
        tagIds: selectedTagIds,
        entityLinks: entityLinks.map(l => ({ entityType: l.entityType, entityId: l.entityId })),
        reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
      })
      onClose()
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle keyboard events for task list auto-continuation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return

    const textarea = e.currentTarget
    const { selectionStart } = textarea
    const lines = content.substring(0, selectionStart).split("\n")
    const currentLine = lines[lines.length - 1]

    // Check if current line is a task
    const taskMatch = currentLine.match(/^- \[([ x])\] (.*)$/i)
    if (taskMatch) {
      const taskContent = taskMatch[2]
      // If task is empty (just pressed Enter on empty task), remove the task prefix
      if (!taskContent.trim()) {
        e.preventDefault()
        const lineStart = selectionStart - currentLine.length
        setContent(content.substring(0, lineStart) + content.substring(selectionStart))
        setTimeout(() => {
          textarea.setSelectionRange(lineStart, lineStart)
        }, 0)
        return
      }
      // Otherwise, add a new task on next line
      e.preventDefault()
      const insertion = "\n- [ ] "
      setContent(content.substring(0, selectionStart) + insertion + content.substring(selectionStart))
      setTimeout(() => {
        textarea.setSelectionRange(selectionStart + insertion.length, selectionStart + insertion.length)
      }, 0)
    }

    // Check if current line is a list item
    const listMatch = currentLine.match(/^- (.*)$/)
    if (listMatch && !taskMatch) {
      const listContent = listMatch[1]
      if (!listContent.trim()) {
        e.preventDefault()
        const lineStart = selectionStart - currentLine.length
        setContent(content.substring(0, lineStart) + content.substring(selectionStart))
        setTimeout(() => {
          textarea.setSelectionRange(lineStart, lineStart)
        }, 0)
        return
      }
      e.preventDefault()
      const insertion = "\n- "
      setContent(content.substring(0, selectionStart) + insertion + content.substring(selectionStart))
      setTimeout(() => {
        textarea.setSelectionRange(selectionStart + insertion.length, selectionStart + insertion.length)
      }, 0)
    }
  }, [content])

  const handleTaskToggle = useCallback((taskIndex: number, checked: boolean) => {
    const lines = content.split("\n")
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

    setContent(newLines.join("\n"))
  }, [content])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "#FFFFFF" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-4 border-b"
          style={{ background: "#FFFFFF", borderColor: "#EEEEEE" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
            Modifier la note
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: "#666666" }} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type Selector */}
          <div className="flex items-center gap-2">
            {typeOptions.map((opt) => {
              const Icon = opt.icon
              const isActive = noteType === opt.type
              return (
                <button
                  key={opt.type}
                  onClick={() => setNoteType(opt.type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isActive ? opt.bgColor : "#F5F5F5",
                    color: isActive ? opt.color : "#666666",
                    border: isActive ? `1px solid ${opt.color}` : "1px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Toolbar */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg flex-wrap"
            style={{ background: "#F5F5F5" }}
          >
            {toolbarButtons.map((button) => {
              const Icon = button.icon
              return (
                <button
                  key={button.action}
                  onClick={() => handleToolbarAction(button)}
                  className="p-2 rounded-md hover:bg-white transition-colors"
                  title={button.label}
                >
                  <Icon className="w-4 h-4" style={{ color: "#666666" }} />
                </button>
              )
            })}
            <div className="w-px h-6 mx-1" style={{ background: "#DDDDDD" }} />
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                showPreview ? "bg-white" : ""
              }`}
              style={{ color: showPreview ? "#0064FA" : "#666666" }}
            >
              {showPreview ? "Éditer" : "Aperçu"}
            </button>
          </div>

          {/* Content */}
          {showPreview ? (
            <div
              className="min-h-[200px] p-4 rounded-xl"
              style={{ background: "#F9F9F9" }}
            >
              <MarkdownPreview
                content={content}
                interactive={true}
                onTaskToggle={handleTaskToggle}
              />
            </div>
          ) : (
            <TaskTextarea
              value={content}
              onChange={setContent}
              placeholder="Contenu de la note..."
              minHeight="200px"
            />
          )}

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "#666666" }}>
                Tags
              </span>
              <button
                onClick={() => setShowTagSelector(!showTagSelector)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <Plus className="w-4 h-4" style={{ color: "#666666" }} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTagIds.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId)
                if (!tag) return null
                return (
                  <span
                    key={tagId}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer"
                    style={{
                      background: `${tag.color || "#0064FA"}15`,
                      color: tag.color || "#0064FA",
                    }}
                    onClick={() => setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId))}
                  >
                    #{tag.name}
                    <X className="w-3 h-3" />
                  </span>
                )
              })}
            </div>
            {showTagSelector && (
              <div className="mt-2 p-2 rounded-lg" style={{ background: "#F5F5F5" }}>
                <div className="flex flex-wrap gap-1">
                  {tags
                    .filter((t) => !selectedTagIds.includes(t.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTagIds([...selectedTagIds, tag.id])
                        }}
                        className="px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{
                          background: `${tag.color || "#0064FA"}15`,
                          color: tag.color || "#0064FA",
                        }}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  {tags.filter((t) => !selectedTagIds.includes(t.id)).length === 0 && (
                    <span className="text-xs" style={{ color: "#999999" }}>
                      Tous les tags sont sélectionnés
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Entity Links */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "#666666" }}>
                Liens
              </span>
              <button
                onClick={() => setShowEntitySelector(!showEntitySelector)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <Plus className="w-4 h-4" style={{ color: "#666666" }} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {entityLinks.map((link, idx) => {
                const config = entityTypes.find((e) => e.type === link.entityType)
                const Icon = config?.icon || Building2
                return (
                  <span
                    key={idx}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer"
                    style={{
                      background: `${config?.color || "#666666"}15`,
                      color: config?.color || "#666666",
                    }}
                    onClick={() => handleRemoveEntityLink(link.entityType, link.entityId)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.entityName || `${config?.label || link.entityType} #${link.entityId}`}
                    <X className="w-3 h-3" />
                  </span>
                )
              })}
            </div>
            {showEntitySelector && (
              <div className="mt-2 p-3 rounded-lg" style={{ background: "#F5F5F5" }}>
                {!selectedEntityType ? (
                  <div className="flex flex-wrap gap-2">
                    {entityTypes.map((ent) => {
                      const Icon = ent.icon
                      return (
                        <button
                          key={ent.type}
                          onClick={() => setSelectedEntityType(ent.type)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                          style={{
                            background: `${ent.color}15`,
                            color: ent.color,
                          }}
                        >
                          <Icon className="w-4 h-4" />
                          {ent.label}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => {
                          setSelectedEntityType(null)
                          setEntitySearchQuery("")
                          setEntitySearchResults([])
                        }}
                        className="text-sm"
                        style={{ color: "#0064FA" }}
                      >
                        ← Retour
                      </button>
                      <span className="text-sm font-medium" style={{ color: "#666666" }}>
                        {entityTypes.find((e) => e.type === selectedEntityType)?.label}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={entitySearchQuery}
                      onChange={(e) => setEntitySearchQuery(e.target.value)}
                      placeholder="Rechercher..."
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "#FFFFFF" }}
                      autoFocus
                    />
                    {isSearching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#0064FA" }} />
                      </div>
                    )}
                    {!isSearching && entitySearchResults.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {entitySearchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleAddEntityLink(result.id, result.label)}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white transition-colors"
                            style={{ color: "#333333" }}
                          >
                            {result.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {!isSearching && entitySearchQuery && entitySearchResults.length === 0 && (
                      <p className="text-sm mt-2" style={{ color: "#999999" }}>
                        Aucun résultat
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reminder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "#666666" }}>
                Rappel
              </span>
              {reminderAt && (
                <button
                  onClick={() => setReminderAt("")}
                  className="text-xs hover:underline"
                  style={{ color: "#F04B69" }}
                >
                  Supprimer
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#999999" }} />
                <input
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(e) => setReminderAt(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: "#F5F5F5",
                    color: "#333333",
                    border: "1px solid transparent",
                  }}
                />
              </div>
            </div>
            {reminderAt && (
              <p className="mt-2 text-xs" style={{ color: "#28B95F" }}>
                <Clock className="inline w-3 h-3 mr-1" />
                Rappel programmé pour le {new Date(reminderAt).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t"
          style={{ background: "#FFFFFF", borderColor: "#EEEEEE" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ background: "#F5F5F5", color: "#666666" }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: "#0064FA", color: "#FFFFFF" }}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Enregistrer"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
