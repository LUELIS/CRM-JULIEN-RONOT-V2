"use client"

import { useState, useEffect, use } from "react"
import {
  Building2,
  FileText,
  Calendar,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"

interface QuoteData {
  id: string
  quoteNumber: string
  status: string
  issueDate: string
  validityDate: string
  notes: string | null
  termsConditions: string | null
  client: {
    companyName: string
    address: string | null
    postalCode: string | null
    city: string | null
    email: string | null
    siret: string | null
    vatNumber: string | null
  }
  company: {
    name: string
    address: string | null
    postalCode: string | null
    city: string | null
    siret: string | null
    vatNumber: string | null
  }
  items: {
    id: string
    title: string
    description: string | null
    quantity: number
    unit: string
    unitPriceHt: number
    vatRate: number
    totalHt: number
    totalTtc: number
  }[]
  subtotalHt: number
  taxAmount: number
  totalTtc: number
}

export default function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [responding, setResponding] = useState(false)
  const [responseMessage, setResponseMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/public/quote/${token}`)
        if (res.ok) {
          const data = await res.json()
          setQuote(data)
        } else {
          const errData = await res.json()
          setError(errData.error || "Devis introuvable")
        }
      } catch {
        setError("Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }
    fetchQuote()
  }, [token])

  const respondToQuote = async (accept: boolean) => {
    setResponding(true)
    try {
      const res = await fetch(`/api/public/quote/${token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      })
      if (res.ok) {
        const data = await res.json()
        setResponseMessage(data.message)
        // Refresh quote data
        const refreshRes = await fetch(`/api/public/quote/${token}`)
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          setQuote(refreshData)
        }
      }
    } catch {
      setResponseMessage("Erreur lors de la réponse")
    } finally {
      setResponding(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "accepted":
        return {
          label: "Accepté",
          color: "text-green-600 bg-green-100",
          icon: CheckCircle,
        }
      case "sent":
        return {
          label: "En attente",
          color: "text-blue-600 bg-blue-100",
          icon: Clock,
        }
      case "rejected":
        return {
          label: "Refusé",
          color: "text-red-600 bg-red-100",
          icon: XCircle,
        }
      case "expired":
        return {
          label: "Expiré",
          color: "text-orange-600 bg-orange-100",
          icon: AlertCircle,
        }
      default:
        return {
          label: status,
          color: "text-gray-600 bg-gray-100",
          icon: FileText,
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du devis...</p>
        </div>
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Devis introuvable
          </h1>
          <p className="text-gray-600">
            {error || "Ce devis n'existe pas ou le lien a expiré."}
          </p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(quote.status)
  const StatusIcon = statusInfo.icon
  const canRespond = quote.status === "sent"

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Devis {quote.quoteNumber}
                </h1>
                <p className="text-gray-500">
                  Émis le {formatDate(quote.issueDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${statusInfo.color}`}
              >
                <StatusIcon className="h-5 w-5" />
                {statusInfo.label}
              </span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Response Actions */}
        {canRespond && !responseMessage && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
            <h2 className="text-lg font-semibold mb-2">
              Répondre à ce devis
            </h2>
            <p className="text-blue-100 mb-4">
              Validité jusqu&apos;au {formatDate(quote.validityDate)}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => respondToQuote(true)}
                disabled={responding}
                className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ThumbsUp className="h-5 w-5" />
                Accepter le devis
              </button>
              <button
                onClick={() => respondToQuote(false)}
                disabled={responding}
                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ThumbsDown className="h-5 w-5" />
                Refuser
              </button>
            </div>
          </div>
        )}

        {responseMessage && (
          <div className="bg-green-100 border border-green-300 text-green-800 rounded-lg p-4 mb-6">
            <p className="font-medium">{responseMessage}</p>
          </div>
        )}

        {/* Quote Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden print:shadow-none">
          {/* Company & Client Info */}
          <div className="grid md:grid-cols-2 gap-8 p-8 border-b">
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Émetteur
              </h2>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {quote.company.name}
                  </p>
                  {quote.company.address && (
                    <p className="text-gray-600">{quote.company.address}</p>
                  )}
                  {quote.company.postalCode && quote.company.city && (
                    <p className="text-gray-600">
                      {quote.company.postalCode} {quote.company.city}
                    </p>
                  )}
                  {quote.company.siret && (
                    <p className="text-sm text-gray-500 mt-2">
                      SIRET: {quote.company.siret}
                    </p>
                  )}
                  {quote.company.vatNumber && (
                    <p className="text-sm text-gray-500">
                      TVA: {quote.company.vatNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Destinataire
              </h2>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {quote.client.companyName}
                  </p>
                  {quote.client.address && (
                    <p className="text-gray-600">{quote.client.address}</p>
                  )}
                  {quote.client.postalCode && quote.client.city && (
                    <p className="text-gray-600">
                      {quote.client.postalCode} {quote.client.city}
                    </p>
                  )}
                  {quote.client.siret && (
                    <p className="text-sm text-gray-500 mt-2">
                      SIRET: {quote.client.siret}
                    </p>
                  )}
                  {quote.client.vatNumber && (
                    <p className="text-sm text-gray-500">
                      TVA: {quote.client.vatNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-6 p-8 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Date d&apos;émission:{" "}
                <strong>{formatDate(quote.issueDate)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Valide jusqu&apos;au:{" "}
                <strong>{formatDate(quote.validityDate)}</strong>
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Qté
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Prix HT
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    TVA
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total HT
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {formatCurrency(item.unitPriceHt)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {item.vatRate}%
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(item.totalHt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-8 bg-gray-50">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total HT</span>
                <span>{formatCurrency(quote.subtotalHt)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>TVA</span>
                <span>{formatCurrency(quote.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>Total TTC</span>
                <span>{formatCurrency(quote.totalTtc)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(quote.notes || quote.termsConditions) && (
            <div className="p-8 border-t space-y-4">
              {quote.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Notes
                  </h3>
                  <p className="text-gray-600 whitespace-pre-line">
                    {quote.notes}
                  </p>
                </div>
              )}
              {quote.termsConditions && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Conditions générales
                  </h3>
                  <p className="text-gray-600 text-sm whitespace-pre-line">
                    {quote.termsConditions}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Ce document a été généré automatiquement.</p>
        </div>
      </div>
    </div>
  )
}
