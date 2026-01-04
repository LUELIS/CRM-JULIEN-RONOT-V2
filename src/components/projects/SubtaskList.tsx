"use client"

import { useState } from "react"
import { CheckSquare, Plus, Trash2, User, Calendar, Flag, GripVertical } from "lucide-react"
import { StyledSelect } from "@/components/ui/styled-select"

interface Subtask {
  id: string
  title: string
  isCompleted: boolean
  position: number
  priority: string
  dueDate: string | null
  assigneeId: string | null
  assignee: { id: string; name: string } | null
}

interface User {
  id: string
  name: string
}

interface SubtaskListProps {
  cardId: string
  subtasks: Subtask[]
  users: User[]
  onUpdate: () => void
}

export default function SubtaskList({ cardId, subtasks, users, onUpdate }: SubtaskListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const completedCount = subtasks.filter(s => s.isCompleted).length
  const totalCount = subtasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || adding) return

    setAdding(true)
    try {
      const res = await fetch(`/api/projects/cards/${cardId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      })

      if (res.ok) {
        setNewSubtaskTitle("")
        setShowAddForm(false)
        onUpdate()
      }
    } catch (error) {
      console.error("Error adding subtask:", error)
    } finally {
      setAdding(false)
    }
  }

  const updateSubtask = async (subtaskId: string, updates: Record<string, any>) => {
    try {
      const res = await fetch(`/api/projects/cards/${cardId}/subtasks/${subtaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error("Error updating subtask:", error)
    }
  }

  const deleteSubtask = async (subtaskId: string) => {
    try {
      const res = await fetch(`/api/projects/cards/${cardId}/subtasks/${subtaskId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        onUpdate()
      }
    } catch (error) {
      console.error("Error deleting subtask:", error)
    }
  }

  const toggleComplete = (subtask: Subtask) => {
    updateSubtask(subtask.id, { isCompleted: !subtask.isCompleted })
  }

  const handleTitleSave = (subtaskId: string) => {
    if (editingTitle.trim()) {
      updateSubtask(subtaskId, { title: editingTitle.trim() })
    }
    setEditingId(null)
    setEditingTitle("")
  }

  const priorityColors: Record<string, string> = {
    low: "text-gray-400",
    medium: "text-blue-500",
    high: "text-orange-500",
    urgent: "text-red-500",
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sous-taches
          </span>
          {totalCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({completedCount}/{totalCount})
            </span>
          )}
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-sm text-[#0064FA] hover:text-[#0052CC] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtasks list */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className={`group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
              subtask.isCompleted ? "opacity-60" : ""
            }`}
          >
            <button
              onClick={() => toggleComplete(subtask)}
              className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                subtask.isCompleted
                  ? "bg-green-500 border-green-500 text-white"
                  : "border-gray-300 dark:border-gray-600 hover:border-green-500"
              }`}
            >
              {subtask.isCompleted && (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <div className="flex-1 min-w-0">
              {editingId === subtask.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleTitleSave(subtask.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave(subtask.id)
                    if (e.key === "Escape") {
                      setEditingId(null)
                      setEditingTitle("")
                    }
                  }}
                  className="w-full px-1 py-0.5 text-sm border-b border-[#0064FA] bg-transparent outline-none text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              ) : (
                <span
                  className={`text-sm cursor-pointer ${
                    subtask.isCompleted
                      ? "line-through text-gray-400 dark:text-gray-500"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={() => {
                    setEditingId(subtask.id)
                    setEditingTitle(subtask.title)
                  }}
                >
                  {subtask.title}
                </span>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-3 mt-1">
                {subtask.assignee && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <User className="h-3 w-3" />
                    {subtask.assignee.name}
                  </span>
                )}
                {subtask.dueDate && (
                  <span className={`flex items-center gap-1 text-xs ${
                    new Date(subtask.dueDate) < new Date() && !subtask.isCompleted
                      ? "text-red-500"
                      : "text-gray-400"
                  }`}>
                    <Calendar className="h-3 w-3" />
                    {new Date(subtask.dueDate).toLocaleDateString("fr-FR")}
                  </span>
                )}
                {subtask.priority !== "medium" && (
                  <Flag className={`h-3 w-3 ${priorityColors[subtask.priority]}`} />
                )}
              </div>
            </div>

            <button
              onClick={() => deleteSubtask(subtask.id)}
              className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSubtask()
              if (e.key === "Escape") {
                setShowAddForm(false)
                setNewSubtaskTitle("")
              }
            }}
            placeholder="Nouvelle sous-tache..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#0064FA] focus:border-transparent outline-none"
            autoFocus
          />
          <button
            onClick={addSubtask}
            disabled={adding || !newSubtaskTitle.trim()}
            className="px-3 py-1.5 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? "..." : "Ajouter"}
          </button>
          <button
            onClick={() => {
              setShowAddForm(false)
              setNewSubtaskTitle("")
            }}
            className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
