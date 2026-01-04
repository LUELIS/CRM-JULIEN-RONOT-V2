"use client"

import { useState } from "react"
import { Plus, X, Check, Tag } from "lucide-react"

interface Label {
  id: string
  name: string
  color: string
}

interface LabelSelectorProps {
  cardId: string
  projectId: string
  selectedLabels: Label[]
  availableLabels: Label[]
  onUpdate: () => void
}

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#14B8A6", "#06B6D4",
  "#0EA5E9", "#3B82F6", "#6366F1", "#8B5CF6",
  "#A855F7", "#D946EF", "#EC4899", "#6B7280",
]

export default function LabelSelector({
  cardId,
  projectId,
  selectedLabels,
  availableLabels,
  onUpdate,
}: LabelSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState("#3B82F6")
  const [creating, setCreating] = useState(false)

  const selectedIds = selectedLabels.map(l => l.id)

  const toggleLabel = async (labelId: string) => {
    const isSelected = selectedIds.includes(labelId)

    try {
      if (isSelected) {
        // Remove label
        await fetch(`/api/projects/cards/${cardId}/labels?labelId=${labelId}`, {
          method: "DELETE",
        })
      } else {
        // Add label
        await fetch(`/api/projects/cards/${cardId}/labels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labelId }),
        })
      }
      onUpdate()
    } catch (error) {
      console.error("Error toggling label:", error)
    }
  }

  const createLabel = async () => {
    if (!newLabelName.trim() || creating) return

    setCreating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor,
        }),
      })

      if (res.ok) {
        const newLabel = await res.json()
        // Auto-add to card
        await fetch(`/api/projects/cards/${cardId}/labels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labelId: newLabel.id }),
        })
        setNewLabelName("")
        setNewLabelColor("#3B82F6")
        setShowCreateForm(false)
        onUpdate()
      }
    } catch (error) {
      console.error("Error creating label:", error)
    } finally {
      setCreating(false)
    }
  }

  const deleteLabel = async (labelId: string) => {
    if (!confirm("Supprimer ce label du projet ?")) return

    try {
      await fetch(`/api/projects/${projectId}/labels/${labelId}`, {
        method: "DELETE",
      })
      onUpdate()
    } catch (error) {
      console.error("Error deleting label:", error)
    }
  }

  return (
    <div className="relative">
      {/* Selected labels display */}
      <div className="flex flex-wrap gap-1 mb-2">
        {selectedLabels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
            <button
              onClick={() => toggleLabel(label.id)}
              className="hover:bg-white/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Add label button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#0064FA] transition-colors"
      >
        <Plus className="h-4 w-4" />
        Ajouter un label
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="p-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">
              Labels
            </p>
          </div>

          {/* Available labels */}
          <div className="max-h-48 overflow-y-auto p-1">
            {availableLabels.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">
                Aucun label
              </p>
            ) : (
              availableLabels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md group"
                >
                  <button
                    onClick={() => toggleLabel(label.id)}
                    className="flex items-center gap-2 flex-1"
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ backgroundColor: label.color }}
                    >
                      {selectedIds.includes(label.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">
                      {label.name}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteLabel(label.id)
                    }}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Create new label */}
          <div className="border-t border-gray-200 p-2">
            {showCreateForm ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Nom du label..."
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-1 focus:ring-[#0064FA] focus:border-transparent outline-none"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewLabelColor(color)}
                      className={`w-5 h-5 rounded transition-transform ${
                        newLabelColor === color ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createLabel}
                    disabled={creating || !newLabelName.trim()}
                    className="flex-1 px-2 py-1 bg-[#0064FA] text-white rounded text-xs font-medium hover:bg-[#0052CC] disabled:opacity-50"
                  >
                    {creating ? "..." : "Creer"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewLabelName("")
                    }}
                    className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded text-xs"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
              >
                <Plus className="h-4 w-4" />
                Creer un label
              </button>
            )}
          </div>

          {/* Close button */}
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={() => setShowDropdown(false)}
              className="w-full p-2 text-sm text-gray-500 hover:bg-gray-50 rounded-md text-center"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
