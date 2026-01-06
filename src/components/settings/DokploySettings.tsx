"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Server,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react"

interface DokployServer {
  id: string
  name: string
  url: string
  apiToken: string
  isActive: boolean
  lastCheckAt: string | null
  lastStatus: string | null
  createdAt: string
}

interface TestResult {
  success: boolean
  message: string
  projects?: number
  details?: {
    projectCount: number
    applicationCount: number
    databaseCount: number
  }
}

export function DokploySettings() {
  const [servers, setServers] = useState<DokployServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formToken, setFormToken] = useState("")
  const [formActive, setFormActive] = useState(true)

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/dokploy")
      if (res.ok) {
        const data = await res.json()
        setServers(data)
      }
    } catch (error) {
      console.error("Error fetching Dokploy servers:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const resetForm = () => {
    setFormName("")
    setFormUrl("")
    setFormToken("")
    setFormActive(true)
    setEditingId(null)
    setShowForm(false)
    setTestResult(null)
  }

  const handleEdit = async (server: DokployServer) => {
    // Fetch full details with token
    try {
      const res = await fetch(`/api/settings/dokploy/${server.id}`)
      if (res.ok) {
        const data = await res.json()
        setFormName(data.name)
        setFormUrl(data.url)
        setFormToken(data.apiToken)
        setFormActive(data.isActive)
        setEditingId(server.id)
        setShowForm(true)
      }
    } catch (error) {
      console.error("Error fetching server details:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTestResult(null)

    try {
      const url = editingId
        ? `/api/settings/dokploy/${editingId}`
        : "/api/settings/dokploy"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          url: formUrl,
          apiToken: formToken,
          isActive: formActive,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.connectionTest) {
          setTestResult(data.connectionTest)
        }
        await fetchServers()
        resetForm()
      } else {
        const error = await res.json()
        setTestResult({ success: false, message: error.error || "Erreur lors de la sauvegarde" })
      }
    } catch (error) {
      setTestResult({ success: false, message: "Erreur de connexion" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce serveur Dokploy ?")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/settings/dokploy/${id}`, { method: "DELETE" })
      if (res.ok) {
        await fetchServers()
      }
    } catch (error) {
      console.error("Error deleting server:", error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    setTestResult(null)

    try {
      const res = await fetch(`/api/settings/dokploy/${id}/test`, { method: "POST" })
      const data = await res.json()
      setTestResult(data)
      await fetchServers()
    } catch (error) {
      setTestResult({ success: false, message: "Erreur lors du test" })
    } finally {
      setTestingId(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 w-full" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#999999" }} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-6 w-full space-y-6" style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#DBEAFE" }}>
            <Server className="h-5 w-5" style={{ color: "#0064FA" }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>Serveurs Dokploy</h2>
            <p className="text-sm" style={{ color: "#666666" }}>Gérez vos serveurs d&apos;infrastructure</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: "#0064FA", color: "#FFFFFF" }}
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl p-4" style={{ background: "#DBEAFE", border: "1px solid #0064FA" }}>
        <h4 className="font-medium mb-2" style={{ color: "#0064FA" }}>Configuration Dokploy</h4>
        <ol className="text-sm space-y-1 list-decimal list-inside" style={{ color: "#0064FA" }}>
          <li>Connectez-vous à votre serveur Dokploy</li>
          <li>Allez dans Settings &gt; Profile &gt; API/CLI</li>
          <li>Générez un nouveau Token API et copiez-le</li>
          <li>Ajoutez le serveur avec l&apos;URL et le token</li>
        </ol>
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className="w-full p-4 rounded-xl flex items-center justify-between"
          style={{
            background: testResult.success ? "#D4EDDA" : "#FEE2E8",
            border: `1px solid ${testResult.success ? "#28B95F" : "#F04B69"}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: testResult.success ? "#28B95F" : "#F04B69" }}
            >
              {testResult.success ? (
                <CheckCircle className="h-5 w-5" style={{ color: "#FFFFFF" }} />
              ) : (
                <AlertCircle className="h-5 w-5" style={{ color: "#FFFFFF" }} />
              )}
            </div>
            <div>
              <span style={{ color: testResult.success ? "#28B95F" : "#F04B69" }}>
                {testResult.message}
              </span>
              {testResult.details && (
                <p className="text-sm" style={{ color: testResult.success ? "#28B95F" : "#F04B69" }}>
                  {testResult.details.projectCount} projet(s), {testResult.details.applicationCount} app(s), {testResult.details.databaseCount} DB(s)
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="hover:opacity-70"
            style={{ color: testResult.success ? "#28B95F" : "#F04B69" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl p-4 space-y-4" style={{ background: "#F5F5F7" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium" style={{ color: "#111111" }}>
              {editingId ? "Modifier le serveur" : "Nouveau serveur"}
            </h3>
            <button type="button" onClick={resetForm} className="p-1 hover:opacity-70">
              <X className="h-5 w-5" style={{ color: "#666666" }} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>Nom du serveur *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Production, Staging, etc."
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                style={inputStyle}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "#444444" }}>URL du serveur *</label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://dokploy.example.com"
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "#444444" }}>Token API *</label>
            <div className="relative">
              <input
                type={showSecrets ? "text" : "password"}
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
                placeholder="Votre token API Dokploy"
                required
                className="w-full px-4 py-2.5 pr-12 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0064FA]/20"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70"
                style={{ color: "#999999" }}
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{ background: formActive ? "#0064FA" : "#CCCCCC" }}
              />
            </label>
            <span className="text-sm" style={{ color: "#444444" }}>Serveur actif</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl font-medium hover:opacity-80"
              style={{ background: "#EEEEEE", color: "#666666" }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Test et sauvegarde...
                </>
              ) : (
                editingId ? "Mettre à jour" : "Ajouter et tester"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="text-center py-8">
          <Server className="h-12 w-12 mx-auto mb-3" style={{ color: "#CCCCCC" }} />
          <p style={{ color: "#666666" }}>Aucun serveur Dokploy configuré</p>
          <p className="text-sm" style={{ color: "#999999" }}>
            Ajoutez un serveur pour monitorer vos déploiements
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <div
              key={server.id}
              className="rounded-xl p-4 flex items-center justify-between"
              style={{
                background: server.isActive ? "#FFFFFF" : "#F5F5F7",
                border: "1px solid #EEEEEE",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: server.lastStatus === "connected" ? "#D4EDDA" : server.lastStatus === "error" ? "#FEE2E8" : "#F5F5F7",
                  }}
                >
                  <Server
                    className="h-5 w-5"
                    style={{
                      color: server.lastStatus === "connected" ? "#28B95F" : server.lastStatus === "error" ? "#F04B69" : "#999999",
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: "#111111" }}>{server.name}</span>
                    {!server.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F5F5F7", color: "#999999" }}>
                        Inactif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#666666" }}>
                    <span>{server.url}</span>
                    {server.lastCheckAt && (
                      <span className="text-xs" style={{ color: "#999999" }}>
                        • Vérifié {new Date(server.lastCheckAt).toLocaleString("fr-FR")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={server.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Ouvrir Dokploy"
                >
                  <ExternalLink className="h-4 w-4" style={{ color: "#666666" }} />
                </a>
                <button
                  onClick={() => handleTest(server.id)}
                  disabled={testingId === server.id}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title="Tester la connexion"
                >
                  {testingId === server.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#0064FA" }} />
                  ) : (
                    <RefreshCw className="h-4 w-4" style={{ color: "#0064FA" }} />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(server)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Modifier"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#666666" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(server.id)}
                  disabled={deletingId === server.id}
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Supprimer"
                >
                  {deletingId === server.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#F04B69" }} />
                  ) : (
                    <Trash2 className="h-4 w-4" style={{ color: "#F04B69" }} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
