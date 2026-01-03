"use client"

import { useState, useEffect, use, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Save, FileText, Loader2, CheckCircle,
  Sparkles, AlertCircle, ClipboardList, ChevronRight
} from "lucide-react"
import dynamic from "next/dynamic"

// Import AI Contract Editor dynamically
const AIContractEditor = dynamic(
  () => import("@/components/contracts/ai-contract-editor").then((mod) => mod.AIContractEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#5F00BA" }} />
      </div>
    )
  }
)

interface Contract {
  id: string
  title: string
  content: string | null
  status: string
  clientId: string | null
  clientName: string | null
}

interface Placeholder {
  original: string
  label: string
  value: string
  type: "text" | "date" | "number"
  context: string // Context around the placeholder to help identify it
  index: number // Index of occurrence for this placeholder text
  position: number // Character position in content
}

// Detect placeholders in content like [À COMPLÉTER], [DATE DE DÉBUT], etc.
// Now detects each occurrence individually with context
function detectPlaceholders(content: string): Placeholder[] {
  const regex = /\[([^\]]+)\]/g
  const placeholders: Placeholder[] = []
  const occurrenceCount: Record<string, number> = {}

  // Strip HTML tags for context extraction but preserve structure
  const plainText = content
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")

  // Find all matches first
  const matches = Array.from(content.matchAll(regex))

  for (const match of matches) {
    const original = match[0]
    const label = match[1]
    const position = match.index ?? 0

    // Track occurrence index for duplicate placeholders
    occurrenceCount[original] = (occurrenceCount[original] || 0) + 1
    const occurrenceIndex = occurrenceCount[original]

    // Find position in plain text (approximate)
    // Search for context around this specific occurrence
    const contentBefore = content.substring(0, position)
    const plainBefore = contentBefore
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<\/div>/gi, " ")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")

    const plainPosition = plainBefore.length

    // Extract context (more words for clarity)
    const beforeText = plainText.substring(Math.max(0, plainPosition - 80), plainPosition)
    const afterText = plainText.substring(plainPosition + original.length, plainPosition + original.length + 50)

    // Get last 6-8 words before and first 4-5 words after for better context
    const beforeWords = beforeText.trim().split(/\s+/).slice(-6).join(" ")
    const afterWords = afterText.trim().split(/\s+/).slice(0, 4).join(" ")

    // Create readable context
    let context = ""
    if (beforeWords) context += `"${beforeWords} `
    context += `___`
    if (afterWords) context += ` ${afterWords}"`
    else context += `"`

    // Determine type based on label and context
    let type: "text" | "date" | "number" = "text"
    const lowerLabel = label.toLowerCase()
    const lowerContext = (beforeWords + " " + afterWords).toLowerCase()

    if (lowerLabel.includes("date") || lowerLabel.includes("jour") ||
        lowerContext.includes("le ") && (lowerContext.includes("janvier") || lowerContext.includes("février") || lowerContext.includes("2025") || lowerContext.includes("2026"))) {
      type = "date"
    } else if (lowerLabel.includes("montant") || lowerLabel.includes("prix") ||
               lowerLabel.includes("durée") || lowerLabel.includes("nombre") ||
               lowerContext.includes("€") || lowerContext.includes("euros")) {
      type = "number"
    }

    // Try to infer a better label from context
    let inferredLabel = label.replace("À COMPLÉTER", "").replace("à compléter", "").trim()
    if (!inferredLabel || inferredLabel === label) {
      // Try to get label from words before placeholder
      const wordsBeforeArray = beforeWords.split(/\s+/)
      const lastWords = wordsBeforeArray.slice(-2).join(" ").toLowerCase()

      if (lastWords.includes("à ") || lastWords.endsWith("à")) {
        inferredLabel = "Lieu"
      } else if (lastWords.includes("le ") || lastWords.endsWith("le")) {
        inferredLabel = "Date"
        type = "date"
      } else if (lastWords.includes("de ") && wordsBeforeArray.length > 0) {
        inferredLabel = wordsBeforeArray[wordsBeforeArray.length - 1]
      }
    }

    placeholders.push({
      original,
      label: inferredLabel || "Champ",
      value: "",
      type,
      context,
      index: occurrenceIndex,
      position,
    })
  }

  return placeholders
}

export default function ContractContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [content, setContent] = useState("")
  const [saved, setSaved] = useState(false)
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([])
  const [showPlaceholderForm, setShowPlaceholderForm] = useState(false)
  const [activeTab, setActiveTab] = useState<"form" | "editor">("form")

  // Detect placeholders when content changes
  const detectedPlaceholders = useMemo(() => {
    return detectPlaceholders(content)
  }, [content])

  const hasUnfilledPlaceholders = detectedPlaceholders.length > 0

  useEffect(() => {
    fetchContract()
  }, [id])

  useEffect(() => {
    // Initialize placeholders state when content loads
    if (content && placeholders.length === 0) {
      setPlaceholders(detectPlaceholders(content))
      if (detectPlaceholders(content).length > 0) {
        setShowPlaceholderForm(true)
        setActiveTab("form")
      }
    }
  }, [content])

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`)
      const data = await res.json()
      if (data.contract) {
        setContract(data.contract)
        setContent(data.contract.content || "")
      }
    } catch (error) {
      console.error("Error fetching contract:", error)
    } finally {
      setLoading(false)
    }
  }

  const updatePlaceholderValue = (index: number, value: string) => {
    setPlaceholders((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], value }
      return updated
    })
  }

  const applyPlaceholders = () => {
    let updatedContent = content

    // Sort placeholders by position in reverse order (from end to start)
    // This ensures that replacing earlier placeholders doesn't affect positions of later ones
    const sortedPlaceholders = [...placeholders]
      .filter((p) => p.value)
      .sort((a, b) => b.position - a.position)

    for (const placeholder of sortedPlaceholders) {
      // Replace at specific position instead of all occurrences
      const before = updatedContent.substring(0, placeholder.position)
      const after = updatedContent.substring(placeholder.position + placeholder.original.length)
      updatedContent = before + placeholder.value + after
    }

    setContent(updatedContent)
    // Refresh placeholders list
    setPlaceholders(detectPlaceholders(updatedContent))
    setActiveTab("editor")
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        alert(data.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      console.error("Error saving contract:", error)
      alert("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleConvertToPdf = async () => {
    // Save first
    if (!saving) {
      await handleSave()
    }

    setConverting(true)
    try {
      const res = await fetch(`/api/contracts/${id}/convert-to-pdf`, {
        method: "POST",
      })
      const data = await res.json()

      if (data.success) {
        router.push(`/contracts/${id}/edit`)
      } else {
        alert(data.error || "Erreur lors de la conversion")
      }
    } catch (error) {
      console.error("Error converting to PDF:", error)
      alert("Erreur lors de la conversion")
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#5F00BA", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "#666666" }}>Contrat non trouvé</p>
        <Link href="/contracts">
          <button className="mt-4 px-4 py-2 rounded-lg" style={{ background: "#0064FA", color: "#FFFFFF" }}>
            Retour aux contrats
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/contracts/${id}`}>
            <button className="p-2 rounded-xl transition-colors hover:bg-[#F5F5F7]">
              <ArrowLeft className="w-5 h-5" style={{ color: "#666666" }} />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "#111111" }}>
              {contract.title}
            </h1>
            <p className="text-sm flex items-center gap-2 mt-1" style={{ color: "#5F00BA" }}>
              <Sparkles className="w-4 h-4" />
              Contenu généré par IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "#F5F5F7", color: "#444444" }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" style={{ color: "#28B95F" }} />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Sauvegarde..." : saved ? "Sauvegardé" : "Sauvegarder"}
          </button>

          <button
            onClick={handleConvertToPdf}
            disabled={converting || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "#5F00BA", color: "#FFFFFF" }}
          >
            {converting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {converting ? "Conversion..." : "Convertir en PDF"}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div
        className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: "linear-gradient(135deg, #F3E8FF 0%, #E8F0FF 100%)" }}
      >
        <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#5F00BA" }} />
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#5F00BA" }}>
            Éditez et personnalisez votre contrat
          </p>
          <p className="text-xs" style={{ color: "#666666" }}>
            Ce contrat a été généré automatiquement depuis votre devis. Vous pouvez modifier le texte ci-dessous puis le convertir en PDF pour ajouter les champs de signature et l&apos;envoyer à vos clients.
          </p>
        </div>
      </div>

      {/* Placeholder Form Alert */}
      {hasUnfilledPlaceholders && (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: "#FEF3CD", border: "1px solid #F0783C" }}
        >
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#F0783C" }} />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1" style={{ color: "#B45309" }}>
              {detectedPlaceholders.length} champ{detectedPlaceholders.length > 1 ? "s" : ""} à compléter
            </p>
            <p className="text-xs" style={{ color: "#92400E" }}>
              Ce contrat contient des éléments à renseigner. Utilisez le formulaire ci-dessous pour les compléter facilement.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {hasUnfilledPlaceholders && (
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#F5F5F7" }}>
          <button
            onClick={() => setActiveTab("form")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "form" ? "#FFFFFF" : "transparent",
              color: activeTab === "form" ? "#5F00BA" : "#666666",
              boxShadow: activeTab === "form" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <ClipboardList className="w-4 h-4" />
            Formulaire ({detectedPlaceholders.length})
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "editor" ? "#FFFFFF" : "transparent",
              color: activeTab === "editor" ? "#5F00BA" : "#666666",
              boxShadow: activeTab === "editor" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <FileText className="w-4 h-4" />
            Éditeur
          </button>
        </div>
      )}

      {/* Placeholder Form */}
      {activeTab === "form" && hasUnfilledPlaceholders && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div
            className="p-4 border-b flex items-center gap-3"
            style={{ borderColor: "#EEEEEE", background: "linear-gradient(135deg, #F3E8FF 0%, #E8F0FF 100%)" }}
          >
            <ClipboardList className="w-5 h-5" style={{ color: "#5F00BA" }} />
            <div>
              <h2 className="font-medium" style={{ color: "#111111" }}>
                Compléter les informations manquantes
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#666666" }}>
                Renseignez les champs ci-dessous pour personnaliser votre contrat
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {placeholders.map((placeholder, index) => (
              <div
                key={`${placeholder.original}-${placeholder.position}`}
                className="rounded-xl p-4 space-y-3"
                style={{ background: "#FAFAFA", border: "1px solid #EEEEEE" }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "#111111" }}>
                      {placeholder.label || "Champ à compléter"}
                    </span>
                    {placeholder.index > 1 && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: "#5F00BA", color: "#FFFFFF" }}>
                        Occurrence #{placeholder.index}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: "#E8F0FF", color: "#0064FA" }}>
                    {placeholder.original}
                  </span>
                </div>
                {/* Show context to help identify the placeholder - with highlighted marker */}
                <div
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{ background: "#FFFFFF", border: "1px dashed #CCCCCC", color: "#666666" }}
                >
                  <span style={{ color: "#999999" }}>Contexte : </span>
                  {placeholder.context.split("___").map((part, i) => (
                    <span key={i}>
                      {part}
                      {i === 0 && (
                        <span
                          className="inline-block px-2 py-0.5 mx-1 rounded font-medium"
                          style={{ background: "#FEF3CD", color: "#F0783C", border: "1px solid #F0783C" }}
                        >
                          ?
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                {placeholder.type === "date" ? (
                  <input
                    type="date"
                    value={placeholder.value}
                    onChange={(e) => updatePlaceholderValue(index, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "#D1D5DB",
                      background: "#FFFFFF",
                    }}
                  />
                ) : placeholder.type === "number" ? (
                  <input
                    type="number"
                    value={placeholder.value}
                    onChange={(e) => updatePlaceholderValue(index, e.target.value)}
                    placeholder={`Entrez ${placeholder.label.toLowerCase() || "la valeur"}`}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "#D1D5DB",
                      background: "#FFFFFF",
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={placeholder.value}
                    onChange={(e) => updatePlaceholderValue(index, e.target.value)}
                    placeholder={`Entrez ${placeholder.label.toLowerCase() || "la valeur"}`}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "#D1D5DB",
                      background: "#FFFFFF",
                    }}
                  />
                )}
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <button
                onClick={applyPlaceholders}
                disabled={placeholders.every((p) => !p.value)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#5F00BA", color: "#FFFFFF" }}
              >
                Appliquer les modifications
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      {(activeTab === "editor" || !hasUnfilledPlaceholders) && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <AIContractEditor
            content={content}
            onChange={(html) => setContent(html)}
            placeholder="Contenu du contrat..."
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Link href={`/contracts/${id}`}>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-[#F5F5F7]"
            style={{ color: "#666666" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "#F5F5F7", color: "#444444" }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>

          <button
            onClick={handleConvertToPdf}
            disabled={converting || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "#5F00BA", color: "#FFFFFF" }}
          >
            {converting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {converting ? "Conversion en cours..." : "Convertir en PDF et continuer"}
          </button>
        </div>
      </div>
    </div>
  )
}
