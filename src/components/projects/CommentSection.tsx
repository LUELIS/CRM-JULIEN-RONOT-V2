"use client"

import { useState } from "react"
import { MessageSquare, Send, MoreHorizontal, Trash2, Edit, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  userId: string
  user: { id: string; name: string } | null
}

interface CommentSectionProps {
  cardId: string
  comments: Comment[]
  onUpdate: () => void
}

export default function CommentSection({ cardId, comments, onUpdate }: CommentSectionProps) {
  const [newComment, setNewComment] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")

  const addComment = async () => {
    if (!newComment.trim() || adding) return

    setAdding(true)
    try {
      const res = await fetch(`/api/projects/cards/${cardId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      })

      if (res.ok) {
        setNewComment("")
        onUpdate()
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setAdding(false)
    }
  }

  const updateComment = async (commentId: string) => {
    if (!editingContent.trim()) return

    try {
      const res = await fetch(`/api/projects/cards/${cardId}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() }),
      })

      if (res.ok) {
        setEditingId(null)
        setEditingContent("")
        onUpdate()
      }
    } catch (error) {
      console.error("Error updating comment:", error)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return

    try {
      const res = await fetch(`/api/projects/cards/${cardId}/comments/${commentId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error("Error deleting comment:", error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "A l'instant"
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`
    return date.toLocaleDateString("fr-FR")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">
          Commentaires
        </span>
        {comments.length > 0 && (
          <span className="text-xs text-gray-500">
            ({comments.length})
          </span>
        )}
      </div>

      {/* Comments list */}
      <div className="space-y-3 mb-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 group">
            <div className="w-8 h-8 rounded-full bg-[#0064FA] flex items-center justify-center text-white text-xs font-medium shrink-0">
              {comment.user ? getInitials(comment.user.name) : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {comment.user?.name || "Utilisateur"}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDate(comment.createdAt)}
                </span>
                {comment.updatedAt !== comment.createdAt && (
                  <span className="text-xs text-gray-400 italic">
                    (modifie)
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingId(comment.id)
                      setEditingContent(comment.content)
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => deleteComment(comment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {editingId === comment.id ? (
                <div className="mt-1">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => updateComment(comment.id)}
                      className="px-3 py-1 bg-[#0064FA] text-white rounded-lg text-xs font-medium hover:bg-[#0052CC]"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditingContent("")
                      }}
                      className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                  {comment.content}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add comment form */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs font-medium shrink-0">
          +
        </div>
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                addComment()
              }
            }}
            placeholder="Ecrire un commentaire..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none resize-none"
            rows={2}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={addComment}
              disabled={adding || !newComment.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {adding ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
