"use client"

import { useState, useEffect, use } from "react"
import {
  Calendar,
  CheckSquare,
  Plus,
  MoreHorizontal,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  LayoutGrid,
  Mail,
  User,
  ArrowRight,
  Paperclip,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Upload,
  Flag,
} from "lucide-react"

interface Card {
  id: string
  title: string
  description: string | null
  position: number
  priority: "low" | "medium" | "high" | "urgent"
  dueDate: string | null
  isCompleted: boolean
  subtasks?: { id: string; title: string; isCompleted: boolean }[]
  cardLabels?: { id: string; name: string; color: string }[]
  comments?: { id: string }[]
  attachments?: { id: string }[]
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
  columns: Column[]
  labels: { id: string; name: string; color: string }[]
}

interface GuestInfo {
  email: string
  name: string | null
  token: string
}

const priorityConfig = {
  low: { bg: "#F3F4F6", text: "#6B7280", label: "Basse" },
  medium: { bg: "#DBEAFE", text: "#2563EB", label: "Moyenne" },
  high: { bg: "#FED7AA", text: "#EA580C", label: "Haute" },
  urgent: { bg: "#FECACA", text: "#DC2626", label: "Urgente" },
}

export default function SharedProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Guest auth
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authEmail, setAuthEmail] = useState("")
  const [authName, setAuthName] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Card creation modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createCardColumnId, setCreateCardColumnId] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState("")
  const [newCardDescription, setNewCardDescription] = useState("")
  const [newCardPriority, setNewCardPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [newCardFiles, setNewCardFiles] = useState<File[]>([])
  const [creatingCard, setCreatingCard] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  // Drag state
  const [draggedCard, setDraggedCard] = useState<Card | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  useEffect(() => {
    // Check for saved guest token
    const savedToken = localStorage.getItem(`project_guest_${resolvedParams.token}`)
    if (savedToken) {
      verifyGuestToken(savedToken)
    } else {
      checkProjectAccess()
    }
  }, [resolvedParams.token])

  const checkProjectAccess = async () => {
    try {
      const res = await fetch(`/api/public/project/${resolvedParams.token}`)
      if (res.ok) {
        setShowAuth(true)
      } else if (res.status === 404) {
        setError("Ce projet n'existe pas ou le partage a ete desactive.")
      } else {
        setError("Une erreur est survenue.")
      }
    } catch {
      setError("Erreur de connexion.")
    } finally {
      setLoading(false)
    }
  }

  const verifyGuestToken = async (guestToken: string) => {
    try {
      const res = await fetch(`/api/public/project/${resolvedParams.token}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestToken }),
      })
      if (res.ok) {
        const data = await res.json()
        setGuestInfo(data.guest)
        setProject(data.project)
        setShowAuth(false)
      } else {
        // Token invalid, show auth form
        localStorage.removeItem(`project_guest_${resolvedParams.token}`)
        checkProjectAccess()
      }
    } catch {
      checkProjectAccess()
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail.trim()) return

    setAuthLoading(true)
    setAuthError(null)

    try {
      const res = await fetch(`/api/public/project/${resolvedParams.token}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), name: authName.trim() || null }),
      })

      if (res.ok) {
        const data = await res.json()
        setGuestInfo(data.guest)
        setProject(data.project)
        setShowAuth(false)
        // Save token for future visits
        localStorage.setItem(`project_guest_${resolvedParams.token}`, data.guest.token)
      } else {
        const err = await res.json()
        setAuthError(err.error || "Erreur d'authentification")
      }
    } catch {
      setAuthError("Erreur de connexion")
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchProject = async () => {
    if (!guestInfo) return
    try {
      const res = await fetch(`/api/public/project/${resolvedParams.token}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestToken: guestInfo.token }),
      })
      if (res.ok) {
        const data = await res.json()
        setProject(data.project)
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    }
  }

  const openCreateModal = (columnId: string) => {
    setCreateCardColumnId(columnId)
    setNewCardTitle("")
    setNewCardDescription("")
    setNewCardPriority("medium")
    setNewCardFiles([])
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreateCardColumnId(null)
    setNewCardTitle("")
    setNewCardDescription("")
    setNewCardPriority("medium")
    setNewCardFiles([])
    setUploadProgress(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]
      const maxSize = 10 * 1024 * 1024 // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize
    })
    setNewCardFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setNewCardFiles(prev => prev.filter((_, i) => i !== index))
  }

  const createCard = async () => {
    if (!newCardTitle.trim() || !guestInfo || !createCardColumnId) return

    setCreatingCard(true)
    try {
      // Create the card first
      const res = await fetch(`/api/public/project/${resolvedParams.token}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestToken: guestInfo.token,
          columnId: createCardColumnId,
          title: newCardTitle.trim(),
          description: newCardDescription.trim() || null,
          priority: newCardPriority,
        }),
      })

      if (res.ok) {
        const card = await res.json()

        // Upload files if any
        if (newCardFiles.length > 0) {
          for (let i = 0; i < newCardFiles.length; i++) {
            setUploadProgress(`Upload ${i + 1}/${newCardFiles.length}...`)
            const formData = new FormData()
            formData.append("file", newCardFiles[i])
            formData.append("guestToken", guestInfo.token)

            await fetch(
              `/api/public/project/${resolvedParams.token}/cards/${card.id}/attachments`,
              { method: "POST", body: formData }
            )
          }
        }

        closeCreateModal()
        fetchProject()
      }
    } catch (error) {
      console.error("Error creating card:", error)
    } finally {
      setCreatingCard(false)
      setUploadProgress(null)
    }
  }

  const moveCard = async (cardId: string, newColumnId: string, newPosition: number) => {
    if (!guestInfo) return

    try {
      await fetch(`/api/public/project/${resolvedParams.token}/cards/${cardId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestToken: guestInfo.token,
          columnId: newColumnId,
          position: newPosition,
        }),
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

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedCard) {
      const column = project?.columns.find(c => c.id === columnId)
      const newPosition = column?.cards.length || 0
      moveCard(draggedCard.id, columnId, newPosition)
    }
    setDraggedCard(null)
    setDragOverColumn(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Projet non disponible</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  // Auth form
  if (showAuth) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#0064FA]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="h-8 w-8 text-[#0064FA]" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Acces au projet</h1>
            <p className="text-gray-500">Entrez votre email pour collaborer sur ce projet</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20 focus:border-[#0064FA]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Votre nom (optionnel)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20 focus:border-[#0064FA]"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || !authEmail.trim()}
              className="w-full py-3 bg-[#0064FA] text-white rounded-xl font-medium hover:bg-[#0052CC] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Acceder au projet
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Votre email sera visible par le proprietaire du projet
          </p>
        </div>
      </div>
    )
  }

  if (!project) return null

  // Sort columns and cards
  const sortedColumns = [...project.columns].sort((a, b) => a.position - b.position)
  sortedColumns.forEach((col) => {
    col.cards = [...col.cards].sort((a, b) => a.position - b.position)
  })

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: project.color + "20" }}
              >
                <LayoutGrid className="h-5 w-5" style={{ color: project.color }} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
                )}
              </div>
            </div>
            {guestInfo && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{guestInfo.name || guestInfo.email}</p>
                  <p className="text-xs text-gray-500">Collaborateur</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#0064FA] flex items-center justify-center text-white font-medium">
                  {(guestInfo.name || guestInfo.email).charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 150px)" }}>
          {sortedColumns.map((column) => (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 rounded-xl p-3 transition-colors ${
                dragOverColumn === column.id ? "bg-blue-100" : "bg-gray-100"
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: column.color }}
                  />
                  <h3 className="font-medium text-gray-900">{column.name}</h3>
                  <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {column.cards.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {column.cards.map((card) => {
                  const completedSubtasks = card.subtasks?.filter((s) => s.isCompleted).length || 0
                  const totalSubtasks = card.subtasks?.length || 0

                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card)}
                      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        card.isCompleted ? "opacity-60" : ""
                      } ${draggedCard?.id === card.id ? "opacity-50" : ""}`}
                    >
                      {/* Labels */}
                      {card.cardLabels && card.cardLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {card.cardLabels.map((label) => (
                            <span
                              key={label.id}
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                background: label.color + "20",
                                color: label.color,
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Title */}
                      <p
                        className={`text-sm font-medium text-gray-900 ${
                          card.isCompleted ? "line-through" : ""
                        }`}
                      >
                        {card.title}
                      </p>

                      {/* Description preview */}
                      {card.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {card.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        {/* Priority */}
                        <span
                          className="px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: priorityConfig[card.priority].bg,
                            color: priorityConfig[card.priority].text,
                          }}
                        >
                          {priorityConfig[card.priority].label}
                        </span>

                        {/* Due date */}
                        {card.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(card.dueDate).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}

                        {/* Subtasks */}
                        {totalSubtasks > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckSquare className="h-3 w-3" />
                            {completedSubtasks}/{totalSubtasks}
                          </span>
                        )}

                        {/* Comments */}
                        {card.comments && card.comments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {card.comments.length}
                          </span>
                        )}

                        {/* Attachments */}
                        {card.attachments && card.attachments.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {card.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Add card button */}
                <button
                  onClick={() => openCreateModal(column.id)}
                  className="w-full py-2 text-gray-500 hover:bg-white hover:text-gray-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une carte
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Nouvelle carte</h2>
              <button
                onClick={closeCreateModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Titre *
                </label>
                <input
                  type="text"
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Titre de la tache..."
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20 focus:border-[#0064FA]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={newCardDescription}
                  onChange={(e) => setNewCardDescription(e.target.value)}
                  placeholder="Decrivez la tache en detail..."
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0064FA]/20 focus:border-[#0064FA] resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Priorite
                </label>
                <div className="flex gap-2">
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewCardPriority(p)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        newCardPriority === p
                          ? "ring-2 ring-offset-1"
                          : "hover:opacity-80"
                      }`}
                      style={{
                        background: priorityConfig[p].bg,
                        color: priorityConfig[p].text,
                        ...(newCardPriority === p && { "--tw-ring-color": priorityConfig[p].text } as React.CSSProperties),
                      }}
                    >
                      {priorityConfig[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Files */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Images & fichiers
                </label>

                {/* File list */}
                {newCardFiles.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {newCardFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                      >
                        {file.type.startsWith("image/") ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#0064FA] hover:bg-[#0064FA]/5 transition-colors">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Cliquez pour ajouter des fichiers
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-1.5">
                  Images (JPG, PNG, GIF, WebP) et PDF. Max 10 MB par fichier.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createCard}
                disabled={!newCardTitle.trim() || creatingCard}
                className="px-4 py-2.5 bg-[#0064FA] text-white rounded-xl font-medium hover:bg-[#0052CC] disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {creatingCard ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadProgress || "Creation..."}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Creer la carte
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
