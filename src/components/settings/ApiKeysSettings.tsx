"use client"

import { useState, useEffect } from "react"
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Book,
  Shield,
} from "lucide-react"

interface ApiKey {
  id: string
  name: string
  description: string | null
  tokenPrefix: string
  permissions: string[]
  isActive: boolean
  expiresAt: string | null
  lastUsedAt: string | null
  rateLimit: number
  createdAt: string
  createdBy: { name: string; email: string } | null
}

interface CreateKeyResponse {
  id: string
  name: string
  token: string
  tokenPrefix: string
  permissions: string[]
  expiresAt: string | null
  message: string
}

export function ApiKeysSettings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyToken, setNewKeyToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyDescription, setNewKeyDescription] = useState("")
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(1000)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["support"])

  const permissions = [
    { id: "support", label: "Support", description: "Gestion des tickets et messages" },
    { id: "clients", label: "Clients", description: "Lecture et modification des clients" },
    { id: "*", label: "Toutes", description: "Accès complet à toutes les ressources" },
  ]

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/settings/api-keys")
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch (err) {
      console.error("Error fetching API keys:", err)
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      setError("Le nom est requis")
      return
    }

    setCreating(true)
    setError(null)

    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          description: newKeyDescription || null,
          permissions: selectedPermissions,
          rateLimit: newKeyRateLimit,
        }),
      })

      if (response.ok) {
        const data: CreateKeyResponse = await response.json()
        setNewKeyToken(data.token)
        fetchApiKeys()
        // Reset form
        setNewKeyName("")
        setNewKeyDescription("")
        setNewKeyRateLimit(1000)
        setSelectedPermissions(["support"])
      } else {
        const data = await response.json()
        setError(data.error || "Erreur lors de la création")
      }
    } catch (err) {
      setError("Erreur de connexion")
    } finally {
      setCreating(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    if (!confirm("Supprimer cette clé API ? Cette action est irréversible.")) {
      return
    }

    try {
      const response = await fetch(`/api/settings/api-keys/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setApiKeys(apiKeys.filter((k) => k.id !== id))
      }
    } catch (err) {
      console.error("Error deleting API key:", err)
    }
  }

  const copyToken = () => {
    if (newKeyToken) {
      navigator.clipboard.writeText(newKeyToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with Doc Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "#5F00BA" }}
          >
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
              Clés API Externes
            </h2>
            <p className="text-sm" style={{ color: "#666666" }}>
              Gérez les accès pour vos prestataires et intégrations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-blue-50"
            style={{ color: "#0064FA", border: "1px solid #0064FA" }}
          >
            <Book className="w-4 h-4" />
            Documentation API
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: "#28B95F" }}
          >
            <Plus className="w-4 h-4" />
            Nouvelle clé
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: "#FEF3C7", border: "1px solid #F59E0B" }}
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#D97706" }} />
        <div className="text-sm" style={{ color: "#92400E" }}>
          <p className="font-medium">Important</p>
          <p>
            Les tokens API ne sont affichés qu&apos;une seule fois à la création.
            Assurez-vous de les copier et de les stocker en lieu sûr.
          </p>
        </div>
      </div>

      {/* API Keys List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#5F00BA" }} />
        </div>
      ) : apiKeys.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
        >
          <Key className="w-12 h-12 mx-auto mb-4" style={{ color: "#999999" }} />
          <p className="font-medium" style={{ color: "#666666" }}>
            Aucune clé API
          </p>
          <p className="text-sm mt-1" style={{ color: "#999999" }}>
            Créez une clé pour permettre à un prestataire d&apos;accéder à votre API
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="rounded-xl p-4"
              style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: key.isActive ? "#DCFCE7" : "#FEE2E2" }}
                  >
                    <Shield
                      className="w-5 h-5"
                      style={{ color: key.isActive ? "#16A34A" : "#DC2626" }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium" style={{ color: "#111111" }}>
                        {key.name}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: key.isActive ? "#DCFCE7" : "#FEE2E2",
                          color: key.isActive ? "#16A34A" : "#DC2626",
                        }}
                      >
                        {key.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {key.description && (
                      <p className="text-sm mt-0.5" style={{ color: "#666666" }}>
                        {key.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "#999999" }}>
                      <span>
                        Préfixe: <code className="bg-gray-100 px-1 rounded">{key.tokenPrefix}...</code>
                      </span>
                      <span>Rate limit: {key.rateLimit}/h</span>
                      <span>Créée le {formatDate(key.createdAt)}</span>
                      {key.lastUsedAt && <span>Dernière utilisation: {formatDate(key.lastUsedAt)}</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {key.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ background: "#EEF2FF", color: "#4F46E5" }}
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteApiKey(key.id)}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" style={{ color: "#DC2626" }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF" }}
          >
            {newKeyToken ? (
              // Token Display
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#DCFCE7" }}
                  >
                    <Check className="w-5 h-5" style={{ color: "#16A34A" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: "#111111" }}>
                      Clé API créée
                    </h3>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Copiez-la maintenant, elle ne sera plus affichée
                    </p>
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl relative"
                  style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
                >
                  <code className="text-sm break-all" style={{ color: "#111111" }}>
                    {newKeyToken}
                  </code>
                  <button
                    onClick={copyToken}
                    className="absolute top-2 right-2 p-2 rounded-lg hover:bg-white transition-colors"
                    title="Copier"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" style={{ color: "#16A34A" }} />
                    ) : (
                      <Copy className="w-4 h-4" style={{ color: "#666666" }} />
                    )}
                  </button>
                </div>

                <div
                  className="p-3 rounded-xl"
                  style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
                >
                  <p className="text-sm" style={{ color: "#991B1B" }}>
                    Ce token ne sera plus jamais affiché. Conservez-le en lieu sûr.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewKeyToken(null)
                  }}
                  className="w-full py-2.5 rounded-xl font-medium text-white"
                  style={{ background: "#5F00BA" }}
                >
                  Fermer
                </button>
              </div>
            ) : (
              // Create Form
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#5F00BA" }}
                  >
                    <Key className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: "#111111" }}>
                      Nouvelle clé API
                    </h3>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      Créez une clé pour un prestataire
                    </p>
                  </div>
                </div>

                {error && (
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
                  >
                    <p className="text-sm" style={{ color: "#991B1B" }}>
                      {error}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Ex: Prestataire Support"
                    className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
                    style={{
                      background: "#F5F5F7",
                      border: "1px solid #EEEEEE",
                      color: "#111111",
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={newKeyDescription}
                    onChange={(e) => setNewKeyDescription(e.target.value)}
                    placeholder="Usage de cette clé..."
                    className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
                    style={{
                      background: "#F5F5F7",
                      border: "1px solid #EEEEEE",
                      color: "#111111",
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Permissions
                  </label>
                  <div className="mt-2 space-y-2">
                    {permissions.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                        style={{
                          background: selectedPermissions.includes(perm.id) ? "#EEF2FF" : "#F5F5F7",
                          border: selectedPermissions.includes(perm.id)
                            ? "1px solid #818CF8"
                            : "1px solid #EEEEEE",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPermissions([...selectedPermissions, perm.id])
                            } else {
                              setSelectedPermissions(selectedPermissions.filter((p) => p !== perm.id))
                            }
                          }}
                          className="rounded"
                        />
                        <div>
                          <span className="font-medium text-sm" style={{ color: "#111111" }}>
                            {perm.label}
                          </span>
                          <p className="text-xs" style={{ color: "#666666" }}>
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium" style={{ color: "#444444" }}>
                    Rate limit (requêtes/heure)
                  </label>
                  <input
                    type="number"
                    value={newKeyRateLimit}
                    onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 1000)}
                    min={100}
                    max={10000}
                    className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
                    style={{
                      background: "#F5F5F7",
                      border: "1px solid #EEEEEE",
                      color: "#111111",
                    }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setError(null)
                    }}
                    className="flex-1 py-2.5 rounded-xl font-medium transition-colors"
                    style={{
                      background: "#F5F5F7",
                      color: "#666666",
                      border: "1px solid #EEEEEE",
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createApiKey}
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-xl font-medium text-white flex items-center justify-center gap-2"
                    style={{ background: "#28B95F" }}
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Créer
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
