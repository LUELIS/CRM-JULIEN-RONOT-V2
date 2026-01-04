"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Calendar,
  Users,
  Clock,
  X,
  Check,
  CheckSquare,
  MessageSquare,
  Paperclip,
  User,
  Flag,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CardDetailModal from "@/components/projects/CardDetailModal"

interface Card {
  id: string
  title: string
  description: string | null
  position: number
  priority: "low" | "medium" | "high" | "urgent"
  labels: string | null
  dueDate: string | null
  client: { id: string; companyName: string } | null
  assignee: { id: string; name: string } | null
  isCompleted: boolean
  subtasks?: { id: string; isCompleted: boolean }[]
  comments?: { id: string }[]
  attachments?: { id: string }[]
  cardLabels?: { id: string; name: string; color: string }[]
}

interface Column {
  id: string
  name: string
  color: string
  position: number
  cards: Card[]
}

interface Project {
  id: string
  name: string
  description: string | null
  color: string
  client: { id: string; companyName: string } | null
  columns: Column[]
}

const priorityColors = {
  low: { bg: "#F3F4F6", text: "#6B7280" },
  medium: { bg: "#DBEAFE", text: "#2563EB" },
  high: { bg: "#FED7AA", text: "#EA580C" },
  urgent: { bg: "#FECACA", text: "#DC2626" },
}

const priorityLabels = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
}

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [draggedCard, setDraggedCard] = useState<Card | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)

  // New card form
  const [addingCardToColumn, setAddingCardToColumn] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState("")
  const [creatingCard, setCreatingCard] = useState(false)

  // New column form
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")

  // Card detail modal
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  useEffect(() => {
    fetchProject()
  }, [resolvedParams.id])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`)
      if (res.ok) {
        const data = await res.json()
        setProject({
          ...data,
          id: String(data.id),
          columns: data.columns.map((col: any) => ({
            ...col,
            id: String(col.id),
            cards: col.cards.map((card: any) => ({
              ...card,
              id: String(card.id),
              client: card.client
                ? { ...card.client, id: String(card.client.id) }
                : null,
              assignee: card.assignee
                ? { ...card.assignee, id: String(card.assignee.id) }
                : null,
            })),
          })),
        })
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    } finally {
      setLoading(false)
    }
  }

  const createCard = async (columnId: string) => {
    if (!newCardTitle.trim()) return

    setCreatingCard(true)
    try {
      const res = await fetch("/api/projects/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId,
          title: newCardTitle.trim(),
        }),
      })

      if (res.ok) {
        setNewCardTitle("")
        setAddingCardToColumn(null)
        fetchProject()
      }
    } catch (error) {
      console.error("Error creating card:", error)
    } finally {
      setCreatingCard(false)
    }
  }

  const createColumn = async () => {
    if (!newColumnName.trim()) return

    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newColumnName.trim() }),
      })

      if (res.ok) {
        setNewColumnName("")
        setAddingColumn(false)
        fetchProject()
      }
    } catch (error) {
      console.error("Error creating column:", error)
    }
  }

  const deleteColumn = async (columnId: string) => {
    if (!confirm("Supprimer cette colonne ?")) return

    try {
      const res = await fetch(`/api/projects/columns/${columnId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchProject()
      } else {
        const data = await res.json()
        alert(data.error || "Erreur")
      }
    } catch (error) {
      console.error("Error deleting column:", error)
    }
  }

  const deleteCard = async (cardId: string) => {
    if (!confirm("Supprimer cette tache ?")) return

    try {
      await fetch(`/api/projects/cards/${cardId}`, { method: "DELETE" })
      fetchProject()
    } catch (error) {
      console.error("Error deleting card:", error)
    }
  }

  const updateCard = async (cardId: string, data: Partial<Card>) => {
    try {
      await fetch(`/api/projects/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      fetchProject()
    } catch (error) {
      console.error("Error updating card:", error)
    }
  }

  const moveCard = async (cardId: string, columnId: string, position: number) => {
    try {
      await fetch(`/api/projects/cards/${cardId}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, position }),
      })
      fetchProject()
    } catch (error) {
      console.error("Error moving card:", error)
    }
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, card: Card) => {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, columnId: string, position: number) => {
    e.preventDefault()
    setDragOverColumn(columnId)
    setDragOverPosition(position)
  }

  const handleDrop = async (e: React.DragEvent, columnId: string, position: number) => {
    e.preventDefault()
    if (!draggedCard) return

    await moveCard(draggedCard.id, columnId, position)
    setDraggedCard(null)
    setDragOverColumn(null)
    setDragOverPosition(null)
  }

  const handleDragEnd = () => {
    setDraggedCard(null)
    setDragOverColumn(null)
    setDragOverPosition(null)
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const getSubtaskProgress = (card: Card) => {
    if (!card.subtasks || card.subtasks.length === 0) return null
    const completed = card.subtasks.filter(s => s.isCompleted).length
    return { completed, total: card.subtasks.length }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0064FA]" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">Projet non trouve</p>
        <button
          onClick={() => router.push("/projects")}
          className="mt-4 text-[#0064FA] hover:underline"
        >
          Retour aux projets
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/projects")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{project.name}</h1>
          </div>
          {project.client && (
            <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              <Users className="h-3 w-3" />
              {project.client.companyName}
            </span>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6 bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-4 h-full min-h-[500px]">
          {project.columns.map((column) => (
            <div
              key={column.id}
              className="flex flex-col w-80 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-xl"
              onDragOver={(e) => handleDragOver(e, column.id, column.cards.length)}
              onDrop={(e) => handleDrop(e, column.id, column.cards.length)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">{column.name}</h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                    {column.cards.length}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                      <MoreHorizontal className="h-4 w-4 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => deleteColumn(column.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {column.cards.map((card, index) => {
                  const subtaskProgress = getSubtaskProgress(card)

                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, column.id, index)}
                      onDrop={(e) => handleDrop(e, column.id, index)}
                      onClick={() => setSelectedCardId(card.id)}
                      className={`bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-md hover:border-[#0064FA]/50 transition-all group ${
                        draggedCard?.id === card.id ? "opacity-50" : ""
                      } ${
                        dragOverColumn === column.id && dragOverPosition === index
                          ? "border-t-2 border-t-[#0064FA]"
                          : ""
                      }`}
                    >
                      {/* Labels */}
                      {card.cardLabels && card.cardLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {card.cardLabels.slice(0, 3).map((label) => (
                            <span
                              key={label.id}
                              className="h-1.5 w-8 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                          ))}
                          {card.cardLabels.length > 3 && (
                            <span className="text-[10px] text-gray-400">
                              +{card.cardLabels.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Title */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${card.isCompleted ? "line-through text-gray-400 dark:text-gray-500" : ""}`}>
                          {card.title}
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-3 w-3 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setSelectedCardId(card.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Ouvrir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateCard(card.id, { isCompleted: !card.isCompleted })}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              {card.isCompleted ? "Non termine" : "Termine"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteCard(card.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap text-[10px]">
                        {/* Priority */}
                        <span
                          className="px-1.5 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: priorityColors[card.priority].bg,
                            color: priorityColors[card.priority].text,
                          }}
                        >
                          {priorityLabels[card.priority]}
                        </span>

                        {/* Due date */}
                        {card.dueDate && (
                          <span className={`flex items-center gap-1 ${
                            isOverdue(card.dueDate) && !card.isCompleted
                              ? "text-red-500"
                              : "text-gray-500 dark:text-gray-400"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(card.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </span>
                        )}

                        {/* Subtasks progress */}
                        {subtaskProgress && (
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <CheckSquare className="h-3 w-3" />
                            {subtaskProgress.completed}/{subtaskProgress.total}
                          </span>
                        )}

                        {/* Comments count */}
                        {card.comments && card.comments.length > 0 && (
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <MessageSquare className="h-3 w-3" />
                            {card.comments.length}
                          </span>
                        )}

                        {/* Attachments count */}
                        {card.attachments && card.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Paperclip className="h-3 w-3" />
                            {card.attachments.length}
                          </span>
                        )}
                      </div>

                      {/* Bottom row: Assignee & Client */}
                      {(card.assignee || card.client) && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                          {card.assignee ? (
                            <div className="flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full bg-[#0064FA] flex items-center justify-center text-white text-[8px] font-medium">
                                {getInitials(card.assignee.name)}
                              </div>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">
                                {card.assignee.name}
                              </span>
                            </div>
                          ) : (
                            <div />
                          )}
                          {card.client && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                              <Users className="h-3 w-3" />
                              <span className="truncate max-w-[60px]">{card.client.companyName}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Drop zone indicator */}
                {dragOverColumn === column.id && dragOverPosition === column.cards.length && (
                  <div className="h-1 bg-[#0064FA] rounded" />
                )}

                {/* Add card form */}
                {addingCardToColumn === column.id ? (
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600">
                    <input
                      type="text"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      placeholder="Titre de la tache..."
                      className="w-full text-sm border-none outline-none bg-transparent text-gray-900 dark:text-gray-100"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createCard(column.id)
                        if (e.key === "Escape") {
                          setAddingCardToColumn(null)
                          setNewCardTitle("")
                        }
                      }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => createCard(column.id)}
                        disabled={creatingCard || !newCardTitle.trim()}
                        className="px-3 py-1 bg-[#0064FA] text-white text-xs rounded font-medium hover:bg-[#0052CC] disabled:opacity-50"
                      >
                        Ajouter
                      </button>
                      <button
                        onClick={() => {
                          setAddingCardToColumn(null)
                          setNewCardTitle("")
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingCardToColumn(column.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter une tache
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add column */}
          {addingColumn ? (
            <div className="w-80 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-xl p-3">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Nom de la colonne..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-[#0064FA] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") createColumn()
                  if (e.key === "Escape") {
                    setAddingColumn(false)
                    setNewColumnName("")
                  }
                }}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={createColumn}
                  disabled={!newColumnName.trim()}
                  className="px-3 py-1.5 bg-[#0064FA] text-white text-sm rounded-lg font-medium hover:bg-[#0052CC] disabled:opacity-50"
                >
                  Ajouter
                </button>
                <button
                  onClick={() => {
                    setAddingColumn(false)
                    setNewColumnName("")
                  }}
                  className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="w-80 flex-shrink-0 h-12 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-400 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter une colonne
            </button>
          )}
        </div>
      </div>

      {/* Card detail modal */}
      {selectedCardId && (
        <CardDetailModal
          cardId={selectedCardId}
          projectId={resolvedParams.id}
          onClose={() => setSelectedCardId(null)}
          onUpdate={fetchProject}
          onDelete={() => {
            fetchProject()
            setSelectedCardId(null)
          }}
        />
      )}
    </div>
  )
}
