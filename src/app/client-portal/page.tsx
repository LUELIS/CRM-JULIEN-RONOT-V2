"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  FileText,
  FileCheck,
  Euro,
  ChevronRight,
  ArrowUpRight,
  CreditCard,
  CalendarClock,
} from "lucide-react"

interface DashboardStats {
  pendingInvoices: number
  totalDue: number
  pendingQuotes: number
  recentInvoices: {
    id: string
    invoiceNumber: string
    totalTtc: number
    status: string
    issueDate: string
  }[]
  recentQuotes: {
    id: string
    quoteNumber: string
    totalTtc: number
    status: string
    issueDate: string
  }[]
  upcomingDebits: {
    id: string
    invoiceNumber: string
    amount: number
    debitDate: string | null
    paymentMethod: string | null
  }[]
}

export default function ClientDashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/client-portal/dashboard")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString))
  }

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    sent: "Envoyée",
    paid: "Payée",
    overdue: "En retard",
    cancelled: "Annulée",
    accepted: "Accepté",
    rejected: "Refusé",
    expired: "Expiré",
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "#F5F5F7", text: "#666666" },
    sent: { bg: "#E6F0FF", text: "#0064FA" },
    paid: { bg: "#E8F8EE", text: "#28B95F" },
    overdue: { bg: "#FEE2E8", text: "#F04B69" },
    cancelled: { bg: "#F5F5F7", text: "#999999" },
    accepted: { bg: "#E8F8EE", text: "#28B95F" },
    rejected: { bg: "#FEE2E8", text: "#F04B69" },
    expired: { bg: "#FFF9E6", text: "#DCB40A" },
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[#EEEEEE] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const formatDebitDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    // Reset time to compare just the dates
    now.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    const diffDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const formattedDate = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date)

    if (diffDays < 0) return `En retard (${formattedDate})`
    if (diffDays === 0) return `Aujourd'hui`
    if (diffDays === 1) return `Demain`
    if (diffDays <= 7) return `Dans ${diffDays} jours (${formattedDate})`
    return formattedDate
  }

  const paymentMethodLabels: Record<string, string> = {
    bank_transfer: "Virement bancaire",
    direct_debit: "Prélèvement automatique",
    debit: "Prélèvement automatique",
    prelevement_sepa: "Prélèvement SEPA",
    card: "Carte bancaire",
    check: "Chèque",
    cash: "Espèces",
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
          Bonjour, {session?.user?.name?.split(" ")[0] || "Client"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#666666" }}>
          Bienvenue dans votre espace client
        </p>
      </div>

      {/* Upcoming Debits */}
      {stats?.upcomingDebits && stats.upcomingDebits.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: "#6366F1" }}>
            {stats.upcomingDebits.length > 1
              ? `${stats.upcomingDebits.length} prélèvements à venir`
              : "Prochain prélèvement"
            }
          </h2>
          {stats.upcomingDebits.map((debit) => (
            <Link
              key={debit.id}
              href={`/client-portal/invoices/${debit.id}`}
              className="block p-4 rounded-2xl transition-all hover:scale-[1.01]"
              style={{
                background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
                border: "1px solid #C7D2FE",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#6366F1" }}
                >
                  <CalendarClock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: "#3730A3" }}>
                    {debit.invoiceNumber}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#5B21B6" }}>
                    {debit.debitDate
                      ? formatDebitDate(debit.debitDate)
                      : "Date à définir"
                    }
                    {debit.paymentMethod && (
                      <span className="text-indigo-400"> • {paymentMethodLabels[debit.paymentMethod] || debit.paymentMethod}</span>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold" style={{ color: "#3730A3" }}>
                    {formatCurrency(debit.amount)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="p-6 rounded-2xl"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#E6F0FF" }}
            >
              <FileText className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                {stats?.pendingInvoices || 0}
              </p>
              <p className="text-sm" style={{ color: "#666666" }}>
                Factures en attente
              </p>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-2xl"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#FEE2E8" }}
            >
              <Euro className="w-6 h-6" style={{ color: "#F04B69" }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                {formatCurrency(stats?.totalDue || 0)}
              </p>
              <p className="text-sm" style={{ color: "#666666" }}>
                Montant dû
              </p>
            </div>
          </div>
        </div>

        <div
          className="p-6 rounded-2xl"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#FFF9E6" }}
            >
              <FileCheck className="w-6 h-6" style={{ color: "#DCB40A" }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: "#111111" }}>
                {stats?.pendingQuotes || 0}
              </p>
              <p className="text-sm" style={{ color: "#666666" }}>
                Devis en attente
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#EEEEEE" }}>
            <h2 className="font-semibold" style={{ color: "#111111" }}>
              Factures récentes
            </h2>
            <Link
              href="/client-portal/invoices"
              className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "#0064FA" }}
            >
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-[#EEEEEE]">
            {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
              stats.recentInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/client-portal/invoices/${invoice.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[#F5F5F7] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "#E6F0FF" }}
                    >
                      <FileText className="w-5 h-5" style={{ color: "#0064FA" }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: "#111111" }}>
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs" style={{ color: "#999999" }}>
                        {formatDate(invoice.issueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium" style={{ color: "#111111" }}>
                      {formatCurrency(invoice.totalTtc)}
                    </p>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: statusColors[invoice.status]?.bg || "#F5F5F7",
                        color: statusColors[invoice.status]?.text || "#666666",
                      }}
                    >
                      {statusLabels[invoice.status] || invoice.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "#CCCCCC" }} />
                <p className="text-sm" style={{ color: "#999999" }}>
                  Aucune facture pour le moment
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Quotes */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#EEEEEE" }}>
            <h2 className="font-semibold" style={{ color: "#111111" }}>
              Devis récents
            </h2>
            <Link
              href="/client-portal/quotes"
              className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "#0064FA" }}
            >
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-[#EEEEEE]">
            {stats?.recentQuotes && stats.recentQuotes.length > 0 ? (
              stats.recentQuotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/client-portal/quotes/${quote.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[#F5F5F7] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: "#FFF9E6" }}
                    >
                      <FileCheck className="w-5 h-5" style={{ color: "#DCB40A" }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: "#111111" }}>
                        {quote.quoteNumber}
                      </p>
                      <p className="text-xs" style={{ color: "#999999" }}>
                        {formatDate(quote.issueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium" style={{ color: "#111111" }}>
                      {formatCurrency(quote.totalTtc)}
                    </p>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: statusColors[quote.status]?.bg || "#F5F5F7",
                        color: statusColors[quote.status]?.text || "#666666",
                      }}
                    >
                      {statusLabels[quote.status] || quote.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center">
                <FileCheck className="w-12 h-12 mx-auto mb-3" style={{ color: "#CCCCCC" }} />
                <p className="text-sm" style={{ color: "#999999" }}>
                  Aucun devis pour le moment
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/client-portal/invoices"
          className="flex items-center justify-between p-6 rounded-2xl transition-all hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #0064FA 0%, #0052CC 100%)",
            boxShadow: "0 4px 16px rgba(0, 100, 250, 0.3)",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Mes factures</p>
              <p className="text-sm text-white/70">Consulter et télécharger</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-white/70" />
        </Link>

        <Link
          href="/client-portal/quotes"
          className="flex items-center justify-between p-6 rounded-2xl transition-all hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #DCB40A 0%, #C9A40A 100%)",
            boxShadow: "0 4px 16px rgba(220, 180, 10, 0.3)",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/20">
              <FileCheck className="w-6 h-6" style={{ color: "#111111" }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "#111111" }}>Mes devis</p>
              <p className="text-sm" style={{ color: "rgba(17, 17, 17, 0.7)" }}>Consulter et accepter</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5" style={{ color: "rgba(17, 17, 17, 0.7)" }} />
        </Link>
      </div>
    </div>
  )
}
