"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  FileCheck,
  Download,
  ArrowLeft,
  Calendar,
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPriceHt: number
  vatRate: number
  totalHt: number
  totalTtc: number
}

interface Quote {
  id: string
  quoteNumber: string
  status: string
  issueDate: string
  validUntil: string | null
  acceptedAt: string | null
  subtotalHt: number
  taxAmount: number
  totalTtc: number
  notes: string | null
  client: {
    companyName: string
    email: string
    phone: string | null
    address: string | null
    postalCode: string | null
    city: string | null
    country: string | null
  }
  items: QuoteItem[]
}

export default function ClientQuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActioning, setIsActioning] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState<"accept" | "reject" | null>(null)

  useEffect(() => {
    async function fetchQuote() {
      try {
        const response = await fetch(`/api/client-portal/quotes/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setQuote(data)
        } else {
          router.push("/client-portal/quotes")
        }
      } catch (error) {
        console.error("Error fetching quote:", error)
        router.push("/client-portal/quotes")
      } finally {
        setIsLoading(false)
      }
    }
    if (params.id) {
      fetchQuote()
    }
  }, [params.id, router])

  const handleAction = async (action: "accept" | "reject") => {
    setIsActioning(true)
    try {
      const response = await fetch(`/api/client-portal/quotes/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (response.ok) {
        const data = await response.json()
        setQuote((prev) => prev ? { ...prev, status: data.status } : null)
        setShowConfirmModal(null)
      }
    } catch (error) {
      console.error("Error updating quote:", error)
    } finally {
      setIsActioning(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateString))
  }

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    sent: "En attente",
    accepted: "Accepté",
    rejected: "Refusé",
    expired: "Expiré",
    converted: "Converti en facture",
  }

  const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    draft: { bg: "#F5F5F7", text: "#666666", icon: Clock },
    sent: { bg: "#E6F0FF", text: "#0064FA", icon: Clock },
    accepted: { bg: "#E8F8EE", text: "#28B95F", icon: CheckCircle },
    rejected: { bg: "#FEE2E8", text: "#F04B69", icon: XCircle },
    expired: { bg: "#FFF9E6", text: "#DCB40A", icon: AlertCircle },
    converted: { bg: "#F3E8FF", text: "#5F00BA", icon: CheckCircle },
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#EEEEEE] rounded-lg animate-pulse" />
        <div className="h-64 bg-white rounded-2xl animate-pulse" />
        <div className="h-96 bg-white rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!quote) {
    return null
  }

  const StatusIcon = statusColors[quote.status]?.icon || Clock
  const canRespond = quote.status === "sent"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/client-portal/quotes"
            className="p-2 rounded-lg transition-colors hover:bg-[#F5F5F7]"
            style={{ color: "#666666" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
              {quote.quoteNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background: statusColors[quote.status]?.bg || "#F5F5F7",
                  color: statusColors[quote.status]?.text || "#666666",
                }}
              >
                <StatusIcon className="w-4 h-4" />
                {statusLabels[quote.status] || quote.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canRespond && (
            <>
              <button
                onClick={() => setShowConfirmModal("reject")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all hover:opacity-90"
                style={{
                  background: "#FEE2E8",
                  color: "#F04B69",
                }}
              >
                <XCircle className="w-5 h-5" />
                Refuser
              </button>
              <button
                onClick={() => setShowConfirmModal("accept")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all hover:opacity-90"
                style={{
                  background: "#28B95F",
                  color: "#FFFFFF",
                  boxShadow: "0 4px 12px rgba(40, 185, 95, 0.3)",
                }}
              >
                <CheckCircle className="w-5 h-5" />
                Accepter
              </button>
            </>
          )}
          <a
            href={`/api/quotes/${quote.id}/download`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all hover:opacity-90"
            style={{
              background: "#0064FA",
              color: "#FFFFFF",
              boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)",
            }}
            download
          >
            <Download className="w-5 h-5" />
            Télécharger
          </a>
        </div>
      </div>

      {/* Action Banner for pending quotes */}
      {canRespond && (
        <div
          className="p-4 rounded-xl flex items-center gap-4"
          style={{ background: "#E6F0FF", border: "1px solid #0064FA" }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#0064FA" }}
          >
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-medium" style={{ color: "#111111" }}>
              Ce devis est en attente de votre réponse
            </p>
            <p className="text-sm" style={{ color: "#666666" }}>
              Veuillez accepter ou refuser ce devis avant le {quote.validUntil ? formatDate(quote.validUntil) : "date d'expiration"}
            </p>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quote Info */}
        <div
          className="p-6 rounded-2xl"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111111" }}>
            Informations du devis
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "#FFF9E6" }}
              >
                <Calendar className="w-5 h-5" style={{ color: "#DCB40A" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#999999" }}>
                  Date d'émission
                </p>
                <p className="font-medium" style={{ color: "#111111" }}>
                  {formatDate(quote.issueDate)}
                </p>
              </div>
            </div>
            {quote.validUntil && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: quote.status === "expired" ? "#FEE2E8" : "#E6F0FF" }}
                >
                  <Clock
                    className="w-5 h-5"
                    style={{ color: quote.status === "expired" ? "#F04B69" : "#0064FA" }}
                  />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Valide jusqu'au
                  </p>
                  <p
                    className="font-medium"
                    style={{ color: quote.status === "expired" ? "#F04B69" : "#111111" }}
                  >
                    {formatDate(quote.validUntil)}
                  </p>
                </div>
              </div>
            )}
            {quote.status === "accepted" && quote.acceptedAt && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#E8F8EE" }}
                >
                  <CheckCircle className="w-5 h-5" style={{ color: "#28B95F" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Accepté le
                  </p>
                  <p className="font-medium" style={{ color: "#28B95F" }}>
                    {formatDate(quote.acceptedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Client Info */}
        <div
          className="p-6 rounded-2xl"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111111" }}>
            Vos informations
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "#FFF9E6" }}
              >
                <Building2 className="w-5 h-5" style={{ color: "#DCB40A" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#999999" }}>
                  Entreprise
                </p>
                <p className="font-medium" style={{ color: "#111111" }}>
                  {quote.client.companyName}
                </p>
              </div>
            </div>
            {quote.client.email && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#E6F0FF" }}
                >
                  <Mail className="w-5 h-5" style={{ color: "#0064FA" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Email
                  </p>
                  <p className="font-medium" style={{ color: "#111111" }}>
                    {quote.client.email}
                  </p>
                </div>
              </div>
            )}
            {quote.client.phone && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#E8F8EE" }}
                >
                  <Phone className="w-5 h-5" style={{ color: "#28B95F" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Téléphone
                  </p>
                  <p className="font-medium" style={{ color: "#111111" }}>
                    {quote.client.phone}
                  </p>
                </div>
              </div>
            )}
            {quote.client.address && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#FFF0E6" }}
                >
                  <MapPin className="w-5 h-5" style={{ color: "#F0783C" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Adresse
                  </p>
                  <p className="font-medium" style={{ color: "#111111" }}>
                    {quote.client.address}
                    {quote.client.postalCode && `, ${quote.client.postalCode}`}
                    {quote.client.city && ` ${quote.client.city}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        <div className="p-6 border-b" style={{ borderColor: "#EEEEEE" }}>
          <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
            Détail du devis
          </h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#F5F5F7" }}>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  Description
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  Quantité
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  Prix unitaire HT
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  TVA
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                  Total TTC
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" >
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <span className="font-medium" style={{ color: "#111111" }}>
                      {item.description}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span style={{ color: "#666666" }}>
                      {item.quantity} {item.unit}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span style={{ color: "#666666" }}>
                      {formatCurrency(item.unitPriceHt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span style={{ color: "#666666" }}>{item.vatRate}%</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold" style={{ color: "#111111" }}>
                      {formatCurrency(item.totalTtc)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Items */}
        <div className="md:hidden divide-y" >
          {quote.items.map((item) => (
            <div key={item.id} className="p-4">
              <p className="font-medium mb-2" style={{ color: "#111111" }}>
                {item.description}
              </p>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#666666" }}>
                  {item.quantity} {item.unit} × {formatCurrency(item.unitPriceHt)}
                </span>
                <span className="font-semibold" style={{ color: "#111111" }}>
                  {formatCurrency(item.totalTtc)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t p-6" style={{ borderColor: "#EEEEEE" }}>
          <div className="max-w-xs ml-auto space-y-3">
            <div className="flex justify-between">
              <span style={{ color: "#666666" }}>Sous-total HT</span>
              <span style={{ color: "#111111" }}>{formatCurrency(quote.subtotalHt)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#666666" }}>TVA</span>
              <span style={{ color: "#111111" }}>{formatCurrency(quote.taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t" style={{ borderColor: "#EEEEEE" }}>
              <span className="text-lg font-semibold" style={{ color: "#111111" }}>
                Total TTC
              </span>
              <span className="text-lg font-bold" style={{ color: "#DCB40A" }}>
                {formatCurrency(quote.totalTtc)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div
          className="p-6 rounded-2xl"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#111111" }}>
            Notes
          </h2>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "#666666" }}>
            {quote.notes}
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="w-full max-w-md p-6 rounded-2xl"
            style={{ background: "#FFFFFF" }}
          >
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: showConfirmModal === "accept" ? "#E8F8EE" : "#FEE2E8",
                }}
              >
                {showConfirmModal === "accept" ? (
                  <CheckCircle className="w-8 h-8" style={{ color: "#28B95F" }} />
                ) : (
                  <XCircle className="w-8 h-8" style={{ color: "#F04B69" }} />
                )}
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#111111" }}>
                {showConfirmModal === "accept" ? "Accepter le devis" : "Refuser le devis"}
              </h3>
              <p className="text-sm mb-6" style={{ color: "#666666" }}>
                {showConfirmModal === "accept"
                  ? "Êtes-vous sûr de vouloir accepter ce devis ? Cette action est définitive."
                  : "Êtes-vous sûr de vouloir refuser ce devis ? Cette action est définitive."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(null)}
                  disabled={isActioning}
                  className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                  style={{ background: "#F5F5F7", color: "#666666" }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleAction(showConfirmModal)}
                  disabled={isActioning}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  style={{
                    background: showConfirmModal === "accept" ? "#28B95F" : "#F04B69",
                    color: "#FFFFFF",
                  }}
                >
                  {isActioning ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {showConfirmModal === "accept" ? "Accepter" : "Refuser"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
