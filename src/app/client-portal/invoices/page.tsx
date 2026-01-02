"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  FileText,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Calendar,
} from "lucide-react"

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  totalTtc: number
  issueDate: string
  dueDate: string
  paymentDate: string | null
}

interface Pagination {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    async function fetchInvoices() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          perPage: "10",
        })
        if (statusFilter !== "all") {
          params.set("status", statusFilter)
        }

        const response = await fetch(`/api/client-portal/invoices?${params}`)
        if (response.ok) {
          const data = await response.json()
          setInvoices(data.invoices)
          setPagination(data.pagination)
        }
      } catch (error) {
        console.error("Error fetching invoices:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInvoices()
  }, [page, statusFilter])

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
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "#F5F5F7", text: "#666666" },
    sent: { bg: "#E6F0FF", text: "#0064FA" },
    paid: { bg: "#E8F8EE", text: "#28B95F" },
    overdue: { bg: "#FEE2E8", text: "#F04B69" },
    cancelled: { bg: "#F5F5F7", text: "#999999" },
  }

  const filterTabs = [
    { key: "all", label: "Toutes" },
    { key: "pending", label: "En attente" },
    { key: "paid", label: "Payées" },
    { key: "overdue", label: "En retard" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
            Mes factures
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            Consultez et téléchargez vos factures
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        className="flex gap-2 p-1 rounded-xl w-fit"
        style={{ background: "#F5F5F7" }}
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setStatusFilter(tab.key)
              setPage(1)
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: statusFilter === tab.key ? "#FFFFFF" : "transparent",
              color: statusFilter === tab.key ? "#111111" : "#666666",
              boxShadow: statusFilter === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-[#F5F5F7] rounded-xl" />
              ))}
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "#E6F0FF" }}
            >
              <FileText className="w-8 h-8" style={{ color: "#0064FA" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "#111111" }}>
              Aucune facture
            </h3>
            <p className="text-sm" style={{ color: "#666666" }}>
              Vous n'avez pas encore de factures
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#F5F5F7" }}>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                      Numéro
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                      Date
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                      Échéance
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                      Montant
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                      Statut
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "#666666" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" >
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium" style={{ color: "#111111" }}>
                          {invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: "#666666" }}>
                          {formatDate(invoice.issueDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm" style={{ color: "#666666" }}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold" style={{ color: "#111111" }}>
                          {formatCurrency(invoice.totalTtc)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: statusColors[invoice.status]?.bg || "#F5F5F7",
                            color: statusColors[invoice.status]?.text || "#666666",
                          }}
                        >
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/client-portal/invoices/${invoice.id}`}
                            className="p-2 rounded-lg transition-colors hover:bg-[#E6F0FF]"
                            style={{ color: "#0064FA" }}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <a
                            href={`/api/invoices/${invoice.id}/download`}
                            className="p-2 rounded-lg transition-colors hover:bg-[#E8F8EE]"
                            style={{ color: "#28B95F" }}
                            download
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y" >
              {invoices.map((invoice) => (
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
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "#EEEEEE" }}>
                <p className="text-sm" style={{ color: "#666666" }}>
                  Page {pagination.page} sur {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-[#F5F5F7]"
                    style={{ color: "#666666" }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="p-2 rounded-lg transition-colors disabled:opacity-50 hover:bg-[#F5F5F7]"
                    style={{ color: "#666666" }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
