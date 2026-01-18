"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import {
  QrCode,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Copy,
  Check,
  X,
  Download,
  BarChart3,
  MousePointer,
  Calendar,
  Globe,
  Monitor,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Link as LinkIcon,
  Tag,
} from "lucide-react"

interface QRCodeData {
  id: number
  name: string
  link: string
  tag: string | null
  click_count: number
  created_at: string | null
}

interface GlobalStats {
  totalQRCodes: number
  totalClicks: number
  clicksToday: number
  clicksThisMonth: number
}

interface ClickStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  byDay: { date: string; count: number }[]
  byLocation: { location: string; count: number }[]
  byBrowser: { browser: string; count: number }[]
}

export default function QRCodePage() {
  const [qrcodes, setQrcodes] = useState<QRCodeData[]>([])
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null)
  const [clickStats, setClickStats] = useState<ClickStats | null>(null)

  // Form states
  const [formName, setFormName] = useState("")
  const [formLink, setFormLink] = useState("")
  const [formTag, setFormTag] = useState("")
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

  // QR customization
  const [qrFgColor, setQrFgColor] = useState("#000000")
  const [qrBgColor, setQrBgColor] = useState("#FFFFFF")
  const [qrSize, setQrSize] = useState(200)

  const qrRef = useRef<HTMLDivElement>(null)

  const fetchQRCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/qrcode")
      if (res.ok) {
        const data = await res.json()
        setQrcodes(data.qrcodes || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error("Error fetching QR codes:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQRCodes()
  }, [fetchQRCodes])

  const handleCreate = async () => {
    if (!formName.trim() || !formLink.trim()) {
      setFormError("Nom et lien requis")
      return
    }

    try {
      new URL(formLink)
    } catch {
      setFormError("URL invalide")
      return
    }

    setSaving(true)
    setFormError("")

    try {
      const res = await fetch("/api/tools/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          link: formLink,
          tag: formTag || null,
        }),
      })

      if (res.ok) {
        setShowCreateModal(false)
        setFormName("")
        setFormLink("")
        setFormTag("")
        fetchQRCodes()
      } else {
        const data = await res.json()
        setFormError(data.error || "Erreur lors de la création")
      }
    } catch {
      setFormError("Erreur réseau")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedQR) return

    if (!formName.trim() || !formLink.trim()) {
      setFormError("Nom et lien requis")
      return
    }

    try {
      new URL(formLink)
    } catch {
      setFormError("URL invalide")
      return
    }

    setSaving(true)
    setFormError("")

    try {
      const res = await fetch(`/api/tools/qrcode/${selectedQR.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          link: formLink,
          tag: formTag || null,
        }),
      })

      if (res.ok) {
        setShowEditModal(false)
        setSelectedQR(null)
        fetchQRCodes()
      } else {
        const data = await res.json()
        setFormError(data.error || "Erreur lors de la mise à jour")
      }
    } catch {
      setFormError("Erreur réseau")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce QR code et toutes ses statistiques ?")) return

    try {
      const res = await fetch(`/api/tools/qrcode/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchQRCodes()
      }
    } catch (error) {
      console.error("Error deleting QR code:", error)
    }
  }

  const openEditModal = (qr: QRCodeData) => {
    setSelectedQR(qr)
    setFormName(qr.name)
    setFormLink(qr.link)
    setFormTag(qr.tag || "")
    setFormError("")
    setShowEditModal(true)
  }

  const openStatsModal = async (qr: QRCodeData) => {
    setSelectedQR(qr)
    setClickStats(null)
    setShowStatsModal(true)

    try {
      const res = await fetch(`/api/tools/qrcode/${qr.id}/stats`)
      if (res.ok) {
        const data = await res.json()
        setClickStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const copyToClipboard = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadQR = (qr: QRCodeData) => {
    const svg = document.getElementById(`qr-svg-${qr.id}`)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const svgUrl = URL.createObjectURL(svgBlob)

    const downloadLink = document.createElement("a")
    downloadLink.href = svgUrl
    downloadLink.download = `qrcode-${qr.name.replace(/\s+/g, "-").toLowerCase()}.svg`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
    URL.revokeObjectURL(svgUrl)
  }

  const getQRUrl = (id: number) => {
    // Use the current domain for new QR codes
    // Existing QR codes from tools.westarter.fr will still work
    if (typeof window !== "undefined") {
      return `${window.location.origin}/link/${id}`
    }
    return `/link/${id}`
  }

  const filteredQRCodes = qrcodes.filter(
    (qr) =>
      qr.name.toLowerCase().includes(search.toLowerCase()) ||
      qr.link.toLowerCase().includes(search.toLowerCase()) ||
      (qr.tag && qr.tag.toLowerCase().includes(search.toLowerCase()))
  )

  const inputStyle = {
    background: "#F5F5F7",
    border: "1px solid #EEEEEE",
    color: "#111111",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "#EEEEEE", borderTopColor: "#5F00BA" }}
          />
          <p style={{ color: "#666666" }}>Chargement des QR codes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0064FA 0%, #14B4E6 100%)",
              }}
            >
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
                QR Codes Dynamiques
              </h1>
              <p style={{ color: "#666666" }}>
                Créez des QR codes dont l'URL peut être modifiée à tout moment
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setFormName("")
              setFormLink("")
              setFormTag("")
              setFormError("")
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-white transition-transform hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #0064FA 0%, #14B4E6 100%)",
            }}
          >
            <Plus className="w-5 h-5" />
            Nouveau QR Code
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div
            className="rounded-xl p-4"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="w-4 h-4" style={{ color: "#0064FA" }} />
              <span className="text-sm" style={{ color: "#666666" }}>
                Total QR Codes
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#111111" }}>
              {stats.totalQRCodes}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MousePointer className="w-4 h-4" style={{ color: "#28B95F" }} />
              <span className="text-sm" style={{ color: "#666666" }}>
                Clics totaux
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#111111" }}>
              {stats.totalClicks}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4" style={{ color: "#F0783C" }} />
              <span className="text-sm" style={{ color: "#666666" }}>
                Aujourd'hui
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#111111" }}>
              {stats.clicksToday}
            </div>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4" style={{ color: "#5F00BA" }} />
              <span className="text-sm" style={{ color: "#666666" }}>
                Ce mois
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#111111" }}>
              {stats.clicksThisMonth}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: "#999999" }}
          />
          <input
            type="text"
            placeholder="Rechercher par nom, URL ou tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl"
            style={inputStyle}
          />
        </div>
      </div>

      {/* QR Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQRCodes.map((qr) => (
          <div
            key={qr.id}
            className="rounded-2xl p-6"
            style={{
              background: "#FFFFFF",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            {/* QR Code Display */}
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                <QRCodeSVG
                  id={`qr-svg-${qr.id}`}
                  value={getQRUrl(qr.id)}
                  size={150}
                  level="M"
                  fgColor={qrFgColor}
                  bgColor={qrBgColor}
                />
              </div>
            </div>

            {/* Info */}
            <div className="mb-4">
              <h3
                className="font-semibold text-lg mb-1"
                style={{ color: "#111111" }}
              >
                {qr.name}
              </h3>
              <div
                className="flex items-center gap-2 text-sm truncate"
                style={{ color: "#666666" }}
              >
                <LinkIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate" title={qr.link}>
                  {qr.link}
                </span>
              </div>
              {qr.tag && (
                <div
                  className="flex items-center gap-1 mt-2"
                  style={{ color: "#999999" }}
                >
                  <Tag className="w-3 h-3" />
                  <span className="text-xs">{qr.tag}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div
              className="flex items-center justify-between mb-4 p-3 rounded-xl"
              style={{ background: "#F5F5F7" }}
            >
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4" style={{ color: "#28B95F" }} />
                <span className="font-medium" style={{ color: "#111111" }}>
                  {qr.click_count} clics
                </span>
              </div>
              <button
                onClick={() => openStatsModal(qr)}
                className="text-sm px-2 py-1 rounded-lg transition-colors hover:bg-white"
                style={{ color: "#0064FA" }}
              >
                Voir détails
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  copyToClipboard(getQRUrl(qr.id), qr.id)
                }
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors"
                style={{ background: "#F5F5F7", color: "#666666" }}
                title="Copier le lien"
              >
                {copiedId === qr.id ? (
                  <Check className="w-4 h-4" style={{ color: "#28B95F" }} />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => downloadQR(qr)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors"
                style={{ background: "#F5F5F7", color: "#666666" }}
                title="Télécharger SVG"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => window.open(qr.link, "_blank")}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors"
                style={{ background: "#F5F5F7", color: "#666666" }}
                title="Ouvrir le lien"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={() => openEditModal(qr)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors"
                style={{ background: "#E8F4FD", color: "#0064FA" }}
                title="Modifier"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(qr.id)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg transition-colors"
                style={{ background: "#FEE2E8", color: "#F04B69" }}
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredQRCodes.length === 0 && (
          <div className="col-span-full text-center py-12">
            <QrCode
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: "#DDDDDD" }}
            />
            <p style={{ color: "#666666" }}>
              {search
                ? "Aucun QR code trouvé"
                : "Aucun QR code. Créez-en un pour commencer !"}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "#111111" }}>
                Nouveau QR Code
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" style={{ color: "#666666" }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#111111" }}
                >
                  Nom *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Menu Restaurant"
                  className="w-full px-4 py-3 rounded-xl"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#111111" }}
                >
                  URL de destination *
                </label>
                <input
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 rounded-xl"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#111111" }}
                >
                  Tag (optionnel)
                </label>
                <input
                  type="text"
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value)}
                  placeholder="Ex: restaurant, marketing"
                  className="w-full px-4 py-3 rounded-xl"
                  style={inputStyle}
                />
              </div>

              {formError && (
                <p className="text-sm" style={{ color: "#F04B69" }}>
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-medium text-white disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, #0064FA 0%, #14B4E6 100%)",
                  }}
                >
                  {saving ? "Création..." : "Créer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "#111111" }}>
                Modifier le QR Code
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" style={{ color: "#666666" }} />
              </button>
            </div>

            {/* Preview */}
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-xl" style={{ background: "#F5F5F7" }}>
                <QRCodeSVG
                  value={getQRUrl(selectedQR.id)}
                  size={120}
                  level="M"
                />
              </div>
            </div>

            <div
              className="p-3 rounded-xl mb-4 text-sm"
              style={{ background: "#FEF3C7", color: "#92400E" }}
            >
              Le QR code reste inchangé. Seule l'URL de destination peut être
              modifiée.
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#111111" }}
                >
                  Nom *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#111111" }}
                >
                  URL de destination *
                </label>
                <input
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "#111111" }}
                >
                  Tag (optionnel)
                </label>
                <input
                  type="text"
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl"
                  style={inputStyle}
                />
              </div>

              {formError && (
                <p className="text-sm" style={{ color: "#F04B69" }}>
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleEdit}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl font-medium text-white disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, #0064FA 0%, #14B4E6 100%)",
                  }}
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && selectedQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#111111" }}>
                  Statistiques
                </h2>
                <p style={{ color: "#666666" }}>{selectedQR.name}</p>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" style={{ color: "#666666" }} />
              </button>
            </div>

            {!clickStats ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw
                  className="w-8 h-8 animate-spin"
                  style={{ color: "#0064FA" }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{ background: "#F5F5F7" }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "#111111" }}
                    >
                      {clickStats.total}
                    </div>
                    <div className="text-sm" style={{ color: "#666666" }}>
                      Total
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{ background: "#F5F5F7" }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "#28B95F" }}
                    >
                      {clickStats.today}
                    </div>
                    <div className="text-sm" style={{ color: "#666666" }}>
                      Aujourd'hui
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{ background: "#F5F5F7" }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "#0064FA" }}
                    >
                      {clickStats.thisWeek}
                    </div>
                    <div className="text-sm" style={{ color: "#666666" }}>
                      Cette semaine
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{ background: "#F5F5F7" }}
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "#5F00BA" }}
                    >
                      {clickStats.thisMonth}
                    </div>
                    <div className="text-sm" style={{ color: "#666666" }}>
                      Ce mois
                    </div>
                  </div>
                </div>

                {/* By Location */}
                {clickStats.byLocation.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-5 h-5" style={{ color: "#0064FA" }} />
                      <h3
                        className="font-semibold"
                        style={{ color: "#111111" }}
                      >
                        Par localisation
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {clickStats.byLocation.map((loc, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: "#F5F5F7" }}
                        >
                          <span style={{ color: "#111111" }}>
                            {loc.location}
                          </span>
                          <span
                            className="font-medium"
                            style={{ color: "#0064FA" }}
                          >
                            {loc.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* By Browser */}
                {clickStats.byBrowser.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Monitor
                        className="w-5 h-5"
                        style={{ color: "#28B95F" }}
                      />
                      <h3
                        className="font-semibold"
                        style={{ color: "#111111" }}
                      >
                        Par navigateur
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {clickStats.byBrowser.map((b, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 rounded-xl"
                          style={{ background: "#F5F5F7" }}
                        >
                          <span style={{ color: "#111111" }}>{b.browser}</span>
                          <span
                            className="ml-2 font-medium"
                            style={{ color: "#28B95F" }}
                          >
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
