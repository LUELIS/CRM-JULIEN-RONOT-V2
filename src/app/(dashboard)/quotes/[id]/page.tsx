"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Pencil,
  Download,
  Send,
  Copy,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  ArrowRight,
  Eye,
  Link2,
  Building2,
  Clock,
  History,
  CheckCheck,
  RotateCcw,
  Euro,
  Calendar,
  X,
  Loader2,
  FileSignature,
  Sparkles,
} from "lucide-react"

interface Quote {
  id: string
  quoteNumber: string
  status: string
  clientId: string
  issueDate: string
  validUntil: string
  notes: string | null
  termsConditions: string | null
  totalHt: number
  totalVat: number
  totalTtc: number
  convertedInvoiceId: string | null
  publicToken: string | null
  viewCount: number
  firstViewedAt: string | null
  lastViewedAt: string | null
  sentAt: string | null
  signedAt: string | null
  signedByName: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    companyName: string
    email: string | null
    phone: string | null
    address: string | null
    postalCode: string | null
    city: string | null
    country: string | null
    siret: string | null
    vatNumber: string | null
    contactFirstname: string | null
    contactLastname: string | null
  }
  items: {
    id: string
    serviceId: string | null
    description: string
    quantity: number
    unitPriceHt: number
    vatRate: number
    totalHt: number
    totalTtc: number
  }[]
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Brouillon", color: "#666666", bg: "#F5F5F7" },
  sent: { label: "Envoyé", color: "#0064FA", bg: "#E3F2FD" },
  accepted: { label: "Accepté", color: "#28B95F", bg: "#D4EDDA" },
  rejected: { label: "Refusé", color: "#F04B69", bg: "#FEE2E8" },
  expired: { label: "Expiré", color: "#F0783C", bg: "#FFF3E0" },
  converted: { label: "Converti", color: "#5F00BA", bg: "#F3E8FF" },
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [contractDialogOpen, setContractDialogOpen] = useState(false)
  const [contractGenerating, setContractGenerating] = useState(false)
  const [existingContract, setExistingContract] = useState<{ id: string; title: string; status: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${id}`)
      if (res.ok) {
        const data = await res.json()
        setQuote(data)
      } else {
        router.push("/quotes")
      }
    } catch (error) {
      console.error("Error fetching quote:", error)
      router.push("/quotes")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  // Check if a contract exists for this quote
  const checkExistingContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${id}/generate-contract`)
      if (res.ok) {
        const data = await res.json()
        if (data.hasContract && data.contract) {
          setExistingContract(data.contract)
        }
      }
    } catch (error) {
      console.error("Error checking contract:", error)
    }
  }, [id])

  useEffect(() => {
    if (quote && (quote.status === "accepted" || quote.status === "sent")) {
      checkExistingContract()
    }
  }, [quote, checkExistingContract])

  const generateContract = async () => {
    setContractGenerating(true)
    try {
      const res = await fetch(`/api/quotes/${id}/generate-contract`, {
        method: "POST",
      })
      const data = await res.json()

      if (res.ok && data.contractId) {
        router.push(`/contracts/${data.contractId}`)
      } else if (data.contractId) {
        // Contract already exists
        router.push(`/contracts/${data.contractId}`)
      } else {
        alert(data.error || "Erreur lors de la génération du contrat")
      }
    } catch (error) {
      console.error("Error generating contract:", error)
      alert("Erreur lors de la génération du contrat")
    } finally {
      setContractGenerating(false)
      setContractDialogOpen(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isExpired = () => {
    if (!quote) return false
    return new Date(quote.validUntil) < new Date()
  }

  const getDaysRemaining = () => {
    if (!quote) return 0
    const diff = new Date(quote.validUntil).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getDaysExpired = () => {
    if (!quote) return 0
    const diff = new Date().getTime() - new Date(quote.validUntil).getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getClientInitials = () => {
    if (!quote) return "??"
    return quote.client.companyName.substring(0, 2).toUpperCase()
  }

  const copyPublicLink = async () => {
    if (!quote?.publicToken) return
    const url = `${window.location.origin}/public/quotes/${quote.publicToken}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  const handleAction = async (action: string) => {
    if (action === "download") {
      window.location.href = `/api/quotes/${id}/download`
      return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        if (action === "convertToInvoice") {
          const data = await res.json()
          router.push(`/invoices/${data.invoiceId}`)
        } else if (action === "duplicate") {
          const data = await res.json()
          router.push(`/quotes/${data.id}`)
        } else {
          fetchQuote()
        }
      }
    } catch (error) {
      console.error("Error performing action:", error)
    } finally {
      setActionLoading(false)
      setConvertDialogOpen(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/quotes")
      }
    } catch (error) {
      console.error("Error deleting quote:", error)
    } finally {
      setActionLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div
          className="h-10 w-10 border-4 rounded-full animate-spin"
          style={{ borderColor: "#EEEEEE", borderTopColor: "#0064FA" }}
        />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-96">
        <p style={{ color: "#666666" }}>Devis introuvable</p>
      </div>
    )
  }

  const computedStatus = quote.convertedInvoiceId
    ? "converted"
    : isExpired() && quote.status === "sent"
    ? "expired"
    : quote.status
  const statusInfo = statusConfig[computedStatus] || statusConfig.draft

  return (
    <div className="space-y-6">
      {/* Header - Style sobre */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:opacity-80"
              style={{ background: "#F5F5F7", color: "#666666" }}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
                {quote.quoteNumber}
              </h1>
              <span
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{ background: statusInfo.bg, color: statusInfo.color }}
              >
                {statusInfo.label}
              </span>
              {quote.viewCount > 0 && (
                <span
                  className="px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                  style={{ background: "#E0F7FA", color: "#00838F" }}
                >
                  <Eye className="h-3 w-3" />
                  {quote.viewCount} vue{quote.viewCount > 1 ? "s" : ""}
                </span>
              )}
              {quote.signedAt && (
                <span
                  className="px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                  style={{ background: "#D4EDDA", color: "#28B95F" }}
                >
                  <CheckCheck className="h-3 w-3" />
                  Signé
                </span>
              )}
            </div>
            <Link
              href={`/clients/${quote.client.id}`}
              className="text-sm mt-1 inline-block hover:underline"
              style={{ color: "#666666" }}
            >
              {quote.client.companyName}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {quote.publicToken && (
            <button
              onClick={copyPublicLink}
              className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ background: "#F3E8FF", color: "#5F00BA" }}
            >
              <Link2 className="h-4 w-4" />
              {copied ? "Copié !" : "Lien public"}
            </button>
          )}
          {quote.status === "draft" && (
            <Link href={`/quotes/${id}/edit`}>
              <button
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "#0064FA", color: "#FFFFFF" }}
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
            </Link>
          )}
          <button
            className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: "#F5F5F7", color: "#666666" }}
            onClick={() => handleAction("download")}
            disabled={actionLoading}
          >
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quote Preview Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Header */}
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#F3E8FF" }}
                  >
                    <FileText className="h-5 w-5" style={{ color: "#5F00BA" }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: "#111111" }}>
                      Aperçu du devis
                    </h3>
                    <p className="text-sm" style={{ color: "#666666" }}>
                      {quote.quoteNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: "#666666" }}>
                    Émis le
                  </p>
                  <p className="font-semibold" style={{ color: "#111111" }}>
                    {formatDate(quote.issueDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Client Info */}
              <div className="rounded-xl p-4 mb-6" style={{ background: "#F5F5F7" }}>
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="h-5 w-5" style={{ color: "#666666" }} />
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#999999" }}
                  >
                    Client
                  </h4>
                </div>
                <p className="font-semibold text-lg" style={{ color: "#111111" }}>
                  {quote.client.companyName}
                </p>
                {(quote.client.contactFirstname || quote.client.contactLastname) && (
                  <p style={{ color: "#666666" }}>
                    {quote.client.contactFirstname} {quote.client.contactLastname}
                  </p>
                )}
                {quote.client.address && (
                  <p className="mt-2" style={{ color: "#666666" }}>
                    {quote.client.address}
                  </p>
                )}
                {(quote.client.postalCode || quote.client.city) && (
                  <p style={{ color: "#666666" }}>
                    {quote.client.postalCode} {quote.client.city}
                  </p>
                )}
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h4
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "#999999" }}
                >
                  Articles / Services
                </h4>
                <div
                  className="overflow-hidden rounded-xl"
                  style={{ border: "1px solid #EEEEEE" }}
                >
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#FAFAFA" }}>
                        <th
                          className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          Description
                        </th>
                        <th
                          className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          Qté
                        </th>
                        <th
                          className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          Prix unit.
                        </th>
                        <th
                          className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#666666" }}
                        >
                          Total HT
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quote.items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-[#FAFAFA] transition-colors"
                          style={{
                            borderBottom:
                              idx < quote.items.length - 1 ? "1px solid #EEEEEE" : "none",
                          }}
                        >
                          <td className="py-4 px-4 font-medium" style={{ color: "#111111" }}>
                            {item.description}
                          </td>
                          <td className="py-4 px-4 text-center" style={{ color: "#666666" }}>
                            {item.quantity}
                          </td>
                          <td className="py-4 px-4 text-right" style={{ color: "#666666" }}>
                            {formatCurrency(item.unitPriceHt)}
                          </td>
                          <td
                            className="py-4 px-4 text-right font-semibold"
                            style={{ color: "#111111" }}
                          >
                            {formatCurrency(item.totalHt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-full md:w-80">
                  <div className="rounded-xl p-5" style={{ background: "#F5F5F7" }}>
                    <div className="space-y-2">
                      <div className="flex justify-between" style={{ color: "#666666" }}>
                        <span>Sous-total HT</span>
                        <span className="font-medium">{formatCurrency(quote.totalHt)}</span>
                      </div>
                      <div className="flex justify-between" style={{ color: "#666666" }}>
                        <span>TVA</span>
                        <span className="font-medium">{formatCurrency(quote.totalVat)}</span>
                      </div>
                      <div className="pt-2 mt-2" style={{ borderTop: "1px solid #DDDDDD" }}>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold" style={{ color: "#111111" }}>
                            Total TTC
                          </span>
                          <span className="text-2xl font-bold" style={{ color: "#5F00BA" }}>
                            {formatCurrency(quote.totalTtc)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              {quote.notes && (
                <div className="mt-6">
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "#999999" }}
                  >
                    Notes
                  </h4>
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "#FFF9E6", border: "1px solid #DCB40A" }}
                  >
                    <p className="whitespace-pre-wrap" style={{ color: "#111111" }}>
                      {quote.notes}
                    </p>
                  </div>
                </div>
              )}

              {quote.termsConditions && (
                <div className="mt-6">
                  <h4
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "#999999" }}
                  >
                    Conditions générales
                  </h4>
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "#E3F2FD", border: "1px solid #0064FA" }}
                  >
                    <p className="whitespace-pre-wrap" style={{ color: "#111111" }}>
                      {quote.termsConditions}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4">
            {/* Montant TTC */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "#666666" }}>
                    Montant TTC
                  </p>
                  <p className="text-2xl font-bold mt-1" style={{ color: "#5F00BA" }}>
                    {formatCurrency(quote.totalTtc)}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "#F3E8FF" }}
                >
                  <Euro className="w-6 h-6" style={{ color: "#5F00BA" }} />
                </div>
              </div>
            </div>

            {/* Validité */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: "#666666" }}>
                    Validité
                  </p>
                  <p className="text-lg font-semibold mt-1" style={{ color: "#111111" }}>
                    {formatDate(quote.validUntil)}
                  </p>
                  {isExpired() ? (
                    <p className="text-xs mt-1" style={{ color: "#F04B69" }}>
                      Expiré depuis {getDaysExpired()} jour{getDaysExpired() > 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: "#28B95F" }}>
                      {getDaysRemaining()} jour{getDaysRemaining() > 1 ? "s" : ""} restant
                      {getDaysRemaining() > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: isExpired() ? "#FEE2E8" : "#D4EDDA" }}
                >
                  <Calendar
                    className="w-6 h-6"
                    style={{ color: isExpired() ? "#F04B69" : "#28B95F" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                Actions
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {quote.status === "accepted" && !quote.convertedInvoiceId && (
                <button
                  className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background: "#28B95F", color: "#FFFFFF" }}
                  onClick={() => setConvertDialogOpen(true)}
                  disabled={actionLoading}
                >
                  <ArrowRight className="h-4 w-4" />
                  Convertir en facture
                </button>
              )}

              {/* Contract generation - show for accepted quotes */}
              {(quote.status === "accepted" || quote.status === "sent") && (
                existingContract ? (
                  <Link href={`/contracts/${existingContract.id}`} className="block">
                    <button
                      className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                      style={{ background: "#E8F5E9", color: "#2E7D32" }}
                    >
                      <FileSignature className="h-4 w-4" />
                      Voir le contrat
                    </button>
                  </Link>
                ) : (
                  <button
                    className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #0064FA 100%)", color: "#FFFFFF" }}
                    onClick={() => setContractDialogOpen(true)}
                    disabled={actionLoading || contractGenerating}
                  >
                    <Sparkles className="h-4 w-4" />
                    Générer un contrat (IA)
                  </button>
                )
              )}

              {quote.convertedInvoiceId && (
                <Link href={`/invoices/${quote.convertedInvoiceId}`} className="block">
                  <button
                    className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                    style={{ background: "#E3F2FD", color: "#0064FA" }}
                  >
                    <FileText className="h-4 w-4" />
                    Voir la facture
                  </button>
                </Link>
              )}

              <button
                className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => handleAction("download")}
                disabled={actionLoading}
              >
                <Download className="h-4 w-4" />
                Télécharger PDF
              </button>

              <button
                className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                style={{ background: "#F3E8FF", color: "#5F00BA" }}
                onClick={() => handleAction("duplicate")}
                disabled={actionLoading}
              >
                <Copy className="h-4 w-4" />
                Dupliquer
              </button>

              {quote.status === "draft" && (
                <>
                  <button
                    className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                    style={{ background: "#E3F2FD", color: "#0064FA" }}
                    onClick={() => handleAction("markSent")}
                    disabled={actionLoading}
                  >
                    <Send className="h-4 w-4" />
                    Marquer comme envoyé
                  </button>

                  <button
                    className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                    style={{ background: "#FEE2E8", color: "#F04B69" }}
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={actionLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </button>
                </>
              )}

              {quote.status === "sent" && !quote.convertedInvoiceId && (
                <div
                  className="space-y-3 pt-3"
                  style={{ borderTop: "1px solid #EEEEEE" }}
                >
                  <button
                    className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ background: "#28B95F", color: "#FFFFFF" }}
                    onClick={() => handleAction("markAccepted")}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Marquer comme accepté
                  </button>
                  <button
                    className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                    style={{ background: "#FEE2E8", color: "#F04B69" }}
                    onClick={() => handleAction("markRejected")}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4" />
                    Marquer comme refusé
                  </button>
                  <button
                    className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                    style={{ background: "#F5F5F7", color: "#666666" }}
                    onClick={() => handleAction("markDraft")}
                    disabled={actionLoading}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Remettre en brouillon
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Card */}
          {(quote.sentAt || quote.viewCount > 0) && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div
                className="px-5 py-4 flex items-center gap-2"
                style={{ borderBottom: "1px solid #EEEEEE" }}
              >
                <History className="h-4 w-4" style={{ color: "#666666" }} />
                <h3 className="font-semibold" style={{ color: "#111111" }}>
                  Suivi
                </h3>
              </div>
              <div className="p-5 space-y-3 text-sm">
                {quote.sentAt && (
                  <div>
                    <span style={{ color: "#666666" }}>Envoyé le :</span>
                    <span className="block font-semibold" style={{ color: "#111111" }}>
                      {formatDateTime(quote.sentAt)}
                    </span>
                  </div>
                )}
                {quote.firstViewedAt && (
                  <div>
                    <span style={{ color: "#666666" }}>Première consultation :</span>
                    <span className="block font-semibold" style={{ color: "#111111" }}>
                      {formatDateTime(quote.firstViewedAt)}
                    </span>
                  </div>
                )}
                {quote.lastViewedAt && quote.viewCount > 1 && (
                  <div>
                    <span style={{ color: "#666666" }}>Dernière consultation :</span>
                    <span className="block font-semibold" style={{ color: "#111111" }}>
                      {formatDateTime(quote.lastViewedAt)}
                    </span>
                  </div>
                )}
                {quote.viewCount > 0 && (
                  <div>
                    <span style={{ color: "#666666" }}>Nombre de vues :</span>
                    <span className="block font-semibold" style={{ color: "#111111" }}>
                      {quote.viewCount}
                    </span>
                  </div>
                )}
                {quote.signedAt && (
                  <div
                    className="pt-3"
                    style={{ borderTop: "1px solid #EEEEEE" }}
                  >
                    <span
                      className="font-bold flex items-center gap-1"
                      style={{ color: "#28B95F" }}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Signé électroniquement
                    </span>
                    {quote.signedByName && (
                      <span className="block mt-1" style={{ color: "#666666" }}>
                        Par : {quote.signedByName}
                      </span>
                    )}
                    <span className="block" style={{ color: "#666666" }}>
                      Le : {formatDateTime(quote.signedAt)}
                    </span>
                  </div>
                )}
                {quote.rejectedAt && (
                  <div
                    className="pt-3"
                    style={{ borderTop: "1px solid #EEEEEE" }}
                  >
                    <span
                      className="font-bold flex items-center gap-1"
                      style={{ color: "#F04B69" }}
                    >
                      <XCircle className="h-4 w-4" />
                      Refusé
                    </span>
                    <span className="block" style={{ color: "#666666" }}>
                      Le : {formatDateTime(quote.rejectedAt)}
                    </span>
                    {quote.rejectionReason && (
                      <span className="block mt-1" style={{ color: "#666666" }}>
                        Raison : {quote.rejectionReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Client Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div
              className="px-5 py-4 flex items-center gap-2"
              style={{ borderBottom: "1px solid #EEEEEE" }}
            >
              <Building2 className="h-4 w-4" style={{ color: "#666666" }} />
              <h3 className="font-semibold" style={{ color: "#111111" }}>
                Client
              </h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  {getClientInitials()}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "#111111" }}>
                    {quote.client.companyName}
                  </p>
                  {quote.client.email && (
                    <p className="text-sm" style={{ color: "#666666" }}>
                      {quote.client.email}
                    </p>
                  )}
                </div>
              </div>

              <Link href={`/clients/${quote.client.id}`}>
                <button
                  className="w-full px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  <Eye className="h-4 w-4" />
                  Voir la fiche client
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#FEE2E8" }}
              >
                <Trash2 className="h-5 w-5" style={{ color: "#F04B69" }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Supprimer le devis
                </h3>
              </div>
            </div>
            <p className="mb-6" style={{ color: "#666666" }}>
              Êtes-vous sûr de vouloir supprimer le devis{" "}
              <strong>{quote.quoteNumber}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => setDeleteDialogOpen(false)}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "#F04B69", color: "#FFFFFF" }}
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Invoice Modal */}
      {convertDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#D4EDDA" }}
              >
                <ArrowRight className="h-5 w-5" style={{ color: "#28B95F" }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Convertir en facture
                </h3>
              </div>
            </div>
            <p className="mb-6" style={{ color: "#666666" }}>
              Cette action va créer une nouvelle facture à partir de ce devis. Le devis
              sera marqué comme converti.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => setConvertDialogOpen(false)}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "#28B95F", color: "#FFFFFF" }}
                onClick={() => handleAction("convertToInvoice")}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Convertir"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Contract Modal */}
      {contractDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#FFFFFF" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #0064FA 100%)" }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                  Générer un contrat
                </h3>
              </div>
            </div>
            <p className="mb-4" style={{ color: "#666666" }}>
              L'IA va transformer ce devis en contrat de prestation professionnel incluant :
            </p>
            <ul className="mb-6 space-y-2 text-sm" style={{ color: "#666666" }}>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: "#28B95F" }} />
                Toutes les prestations et montants du devis
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: "#28B95F" }} />
                Clauses juridiques standards
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" style={{ color: "#28B95F" }} />
                Conditions de paiement et résiliation
              </li>
            </ul>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{ background: "#F5F5F7", color: "#666666" }}
                onClick={() => setContractDialogOpen(false)}
                disabled={contractGenerating}
              >
                Annuler
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #0064FA 100%)", color: "#FFFFFF" }}
                onClick={generateContract}
                disabled={contractGenerating}
              >
                {contractGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Générer
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
