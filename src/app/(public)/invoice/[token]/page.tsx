"use client"

import { useState, useEffect, use } from "react"
import {
  Building2,
  FileText,
  Calendar,
  Euro,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"

interface InvoiceData {
  id: string
  invoiceNumber: string
  status: string
  issueDate: string
  dueDate: string
  paymentMethod: string | null
  notes: string | null
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
    description: string
    quantity: number
    unit: string
    unitPriceHt: number
    vatRate: number
    totalHt: number
    totalTtc: number
  }[]
  subtotalHt: number
  taxAmount: number
  discountAmount: number
  totalTtc: number
}

export default function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/public/invoice/${token}`)
        if (res.ok) {
          const data = await res.json()
          setInvoice(data)
        } else {
          const errData = await res.json()
          setError(errData.error || "Facture introuvable")
        }
      } catch {
        setError("Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }
    fetchInvoice()
  }, [token])

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
      case "paid":
        return {
          label: "Payée",
          color: "text-green-600 bg-green-100",
          icon: CheckCircle,
        }
      case "sent":
        return {
          label: "En attente",
          color: "text-blue-600 bg-blue-100",
          icon: Clock,
        }
      case "overdue":
        return {
          label: "En retard",
          color: "text-red-600 bg-red-100",
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
          <p className="mt-4 text-gray-600">Chargement de la facture...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Facture introuvable
          </h1>
          <p className="text-gray-600">
            {error || "Cette facture n'existe pas ou le lien a expiré."}
          </p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(invoice.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Facture {invoice.invoiceNumber}
                </h1>
                <p className="text-gray-500">
                  Émise le {formatDate(invoice.issueDate)}
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

        {/* Invoice Content */}
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
                    {invoice.company.name}
                  </p>
                  {invoice.company.address && (
                    <p className="text-gray-600">{invoice.company.address}</p>
                  )}
                  {invoice.company.postalCode && invoice.company.city && (
                    <p className="text-gray-600">
                      {invoice.company.postalCode} {invoice.company.city}
                    </p>
                  )}
                  {invoice.company.siret && (
                    <p className="text-sm text-gray-500 mt-2">
                      SIRET: {invoice.company.siret}
                    </p>
                  )}
                  {invoice.company.vatNumber && (
                    <p className="text-sm text-gray-500">
                      TVA: {invoice.company.vatNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Facturé à
              </h2>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {invoice.client.companyName}
                  </p>
                  {invoice.client.address && (
                    <p className="text-gray-600">{invoice.client.address}</p>
                  )}
                  {invoice.client.postalCode && invoice.client.city && (
                    <p className="text-gray-600">
                      {invoice.client.postalCode} {invoice.client.city}
                    </p>
                  )}
                  {invoice.client.siret && (
                    <p className="text-sm text-gray-500 mt-2">
                      SIRET: {invoice.client.siret}
                    </p>
                  )}
                  {invoice.client.vatNumber && (
                    <p className="text-sm text-gray-500">
                      TVA: {invoice.client.vatNumber}
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
                <strong>{formatDate(invoice.issueDate)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Date d&apos;échéance:{" "}
                <strong>{formatDate(invoice.dueDate)}</strong>
              </span>
            </div>
            {invoice.paymentMethod && (
              <div className="flex items-center gap-2">
                <Euro className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Paiement: <strong>{invoice.paymentMethod}</strong>
                </span>
              </div>
            )}
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
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{item.description}</p>
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
                <span>{formatCurrency(invoice.subtotalHt)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Remise</span>
                  <span>-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>TVA</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>Total TTC</span>
                <span>{formatCurrency(invoice.totalTtc)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="p-8 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
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
