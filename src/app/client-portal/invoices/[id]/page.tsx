"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  FileText,
  Download,
  ArrowLeft,
  Calendar,
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitPriceHt: number
  vatRate: number
  totalHt: number
  totalTtc: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  issueDate: string
  dueDate: string
  paymentDate: string | null
  paymentMethod: string | null
  paymentMethodLabel: string | null
  debitDate: string | null
  subtotalHt: number
  taxAmount: number
  totalTtc: number
  discountType: string | null
  discountValue: number
  discountAmount: number
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
  items: InvoiceItem[]
}

export default function ClientInvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`/api/client-portal/invoices/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setInvoice(data)
        } else {
          router.push("/client-portal/invoices")
        }
      } catch (error) {
        console.error("Error fetching invoice:", error)
        router.push("/client-portal/invoices")
      } finally {
        setIsLoading(false)
      }
    }
    if (params.id) {
      fetchInvoice()
    }
  }, [params.id, router])

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
    sent: "Envoyée",
    paid: "Payée",
    overdue: "En retard",
    cancelled: "Annulée",
  }

  const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    draft: { bg: "#F5F5F7", text: "#666666", icon: Clock },
    sent: { bg: "#E6F0FF", text: "#0064FA", icon: Clock },
    paid: { bg: "#E8F8EE", text: "#28B95F", icon: CheckCircle },
    overdue: { bg: "#FEE2E8", text: "#F04B69", icon: AlertCircle },
    cancelled: { bg: "#F5F5F7", text: "#999999", icon: AlertCircle },
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

  if (!invoice) {
    return null
  }

  const StatusIcon = statusColors[invoice.status]?.icon || Clock

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/client-portal/invoices"
            className="p-2 rounded-lg transition-colors hover:bg-[#F5F5F7]"
            style={{ color: "#666666" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
              {invoice.invoiceNumber}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  background: statusColors[invoice.status]?.bg || "#F5F5F7",
                  color: statusColors[invoice.status]?.text || "#666666",
                }}
              >
                <StatusIcon className="w-4 h-4" />
                {statusLabels[invoice.status] || invoice.status}
              </span>
            </div>
          </div>
        </div>
        <a
          href={`/api/invoices/${invoice.id}/download`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:opacity-90"
          style={{
            background: "#0064FA",
            color: "#FFFFFF",
            boxShadow: "0 4px 12px rgba(0, 100, 250, 0.3)",
          }}
          download
        >
          <Download className="w-5 h-5" />
          Télécharger PDF
        </a>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Invoice Info */}
        <div
          className="p-6 rounded-2xl"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111111" }}>
            Informations de facturation
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "#E6F0FF" }}
              >
                <Calendar className="w-5 h-5" style={{ color: "#0064FA" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#999999" }}>
                  Date d'émission
                </p>
                <p className="font-medium" style={{ color: "#111111" }}>
                  {formatDate(invoice.issueDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: invoice.status === "overdue" ? "#FEE2E8" : "#FFF9E6" }}
              >
                <Clock
                  className="w-5 h-5"
                  style={{ color: invoice.status === "overdue" ? "#F04B69" : "#DCB40A" }}
                />
              </div>
              <div>
                <p className="text-xs" style={{ color: "#999999" }}>
                  Date d'échéance
                </p>
                <p
                  className="font-medium"
                  style={{ color: invoice.status === "overdue" ? "#F04B69" : "#111111" }}
                >
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
            {invoice.status === "paid" && invoice.paymentDate && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#E8F8EE" }}
                >
                  <CheckCircle className="w-5 h-5" style={{ color: "#28B95F" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Date de paiement
                  </p>
                  <p className="font-medium" style={{ color: "#28B95F" }}>
                    {formatDate(invoice.paymentDate)}
                  </p>
                </div>
              </div>
            )}
            {invoice.paymentMethod && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#F3E8FF" }}
                >
                  <CreditCard className="w-5 h-5" style={{ color: "#5F00BA" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Mode de paiement
                  </p>
                  <p className="font-medium" style={{ color: "#111111" }}>
                    {invoice.paymentMethodLabel || invoice.paymentMethod}
                  </p>
                </div>
              </div>
            )}
            {invoice.debitDate && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#EEF2FF" }}
                >
                  <Calendar className="w-5 h-5" style={{ color: "#6366F1" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>
                    Date de prélèvement
                  </p>
                  <p className="font-medium" style={{ color: "#6366F1" }}>
                    {formatDate(invoice.debitDate)}
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
                  {invoice.client.companyName}
                </p>
              </div>
            </div>
            {invoice.client.email && (
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
                    {invoice.client.email}
                  </p>
                </div>
              </div>
            )}
            {invoice.client.phone && (
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
                    {invoice.client.phone}
                  </p>
                </div>
              </div>
            )}
            {invoice.client.address && (
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
                    {invoice.client.address}
                    {invoice.client.postalCode && `, ${invoice.client.postalCode}`}
                    {invoice.client.city && ` ${invoice.client.city}`}
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
            Détail de la facture
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
              {invoice.items.map((item) => (
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
          {invoice.items.map((item) => (
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
              <span style={{ color: "#111111" }}>{formatCurrency(invoice.subtotalHt)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <span style={{ color: "#666666" }}>
                  Remise {invoice.discountType === "percentage" ? `(${invoice.discountValue}%)` : ""}
                </span>
                <span style={{ color: "#F04B69" }}>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span style={{ color: "#666666" }}>TVA</span>
              <span style={{ color: "#111111" }}>{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t" style={{ borderColor: "#EEEEEE" }}>
              <span className="text-lg font-semibold" style={{ color: "#111111" }}>
                Total TTC
              </span>
              <span className="text-lg font-bold" style={{ color: "#0064FA" }}>
                {formatCurrency(invoice.totalTtc)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div
          className="p-6 rounded-2xl"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <h2 className="text-lg font-semibold mb-3" style={{ color: "#111111" }}>
            Notes
          </h2>
          <p className="text-sm whitespace-pre-wrap" style={{ color: "#666666" }}>
            {invoice.notes}
          </p>
        </div>
      )}
    </div>
  )
}
