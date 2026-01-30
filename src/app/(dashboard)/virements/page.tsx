"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Banknote,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Euro,
  FileText,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  Building2,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { StyledSelect, SelectOption } from "@/components/ui/styled-select"

const virementStatusOptions: SelectOption[] = [
  { value: "pending", label: "En attente", color: "#F59E0B" },
  { value: "exported", label: "Exportés", color: "#3B82F6" },
  { value: "executed", label: "Remboursés", color: "#10B981" },
]

interface CreditNote {
  id: string
  invoiceNumber: string
  clientId: string
  clientName: string
  clientEmail: string | null
  clientIban: string | null
  clientBic: string | null
  amount: number
  issueDate: string
  status: string
  originalInvoiceId: string | null
  originalInvoiceNumber: string | null
  hasValidSepaInfo: boolean
}

interface ApiResponse {
  invoices: CreditNote[]
  total: number
  totalAmount: number
}

export default function VirementsPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState("pending")
  const [totalAmount, setTotalAmount] = useState(0)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [executionDate, setExecutionDate] = useState("")

  const fetchCreditNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/virements?status=${statusFilter}`)
      if (res.ok) {
        const data: ApiResponse = await res.json()
        setCreditNotes(data.invoices)
        setTotalAmount(data.totalAmount)
      }
    } catch (error) {
      console.error("Error fetching virements:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchCreditNotes()
  }, [fetchCreditNotes])

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    const validNotes = creditNotes.filter((note) => note.hasValidSepaInfo)
    if (selectedIds.size === validNotes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(validNotes.map((note) => note.id)))
    }
  }

  const generatePain001 = async () => {
    if (selectedIds.size === 0) {
      setMessage({ type: "error", text: "Veuillez sélectionner au moins un avoir" })
      return
    }

    setGenerating(true)
    setMessage(null)

    try {
      const res = await fetch("/api/virements/pain001", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedIds),
          executionDate: executionDate || undefined,
        }),
      })

      if (res.ok) {
        // Download the file
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        const disposition = res.headers.get("Content-Disposition")
        const filename = disposition?.match(/filename="(.+)"/)?.[1] || "SEPA_CT.xml"
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        a.remove()

        setMessage({ type: "success", text: `Fichier PAIN.001 généré avec ${selectedIds.size} virement(s)` })

        // Mark as exported
        await fetch("/api/virements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceIds: Array.from(selectedIds),
            action: "mark_exported",
          }),
        })

        setSelectedIds(new Set())
        fetchCreditNotes()
      } else {
        const error = await res.json()
        setMessage({ type: "error", text: error.error || "Erreur lors de la génération" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la génération du fichier" })
    } finally {
      setGenerating(false)
    }
  }

  const markAsRefunded = async () => {
    if (selectedIds.size === 0) return

    try {
      const res = await fetch("/api/virements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedIds),
          action: "mark_refunded",
        }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: `${selectedIds.size} avoir(s) marqué(s) comme remboursé(s)` })
        setSelectedIds(new Set())
        fetchCreditNotes()
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la mise à jour" })
    }
  }

  const selectedAmount = creditNotes
    .filter((note) => selectedIds.has(note.id))
    .reduce((sum, note) => sum + note.amount, 0)

  const validNotesCount = creditNotes.filter((note) => note.hasValidSepaInfo).length
  const invalidNotesCount = creditNotes.filter((note) => !note.hasValidSepaInfo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "#0891B2" }}
            >
              <Banknote className="h-7 w-7" style={{ color: "#FFFFFF" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#111111" }}>
                Virements SEPA
              </h1>
              <p className="text-sm" style={{ color: "#666666" }}>
                Gérez et exportez vos fichiers de virement PAIN.001 (remboursements)
              </p>
            </div>
          </div>

          <button
            onClick={fetchCreditNotes}
            className="px-4 py-2 rounded-xl flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: "#F5F5F7", color: "#666666" }}
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <label className="text-xs font-medium mb-2 block" style={{ color: "#666666" }}>
            Statut
          </label>
          <StyledSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={virementStatusOptions}
            placeholder="Statut"
          />
        </div>

        {/* Total avoirs */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4" style={{ color: "#D97706" }} />
            <span className="text-xs font-medium" style={{ color: "#666666" }}>Avoirs</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#111111" }}>{creditNotes.length}</p>
          {invalidNotesCount > 0 && (
            <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "#F59E0B" }}>
              <AlertTriangle className="h-3 w-3" />
              {invalidNotesCount} sans info SEPA
            </p>
          )}
        </div>

        {/* Total amount */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4" style={{ color: "#0891B2" }} />
            <span className="text-xs font-medium" style={{ color: "#666666" }}>Montant total</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#111111" }}>
            {totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </p>
        </div>

        {/* Selected */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="h-4 w-4" style={{ color: "#5F00BA" }} />
            <span className="text-xs font-medium" style={{ color: "#666666" }}>Sélectionnés</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#111111" }}>{selectedIds.size}</p>
          {selectedIds.size > 0 && (
            <p className="text-xs mt-1" style={{ color: "#666666" }}>
              {selectedAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: message.type === "success" ? "#D1FAE5" : "#FEE2E2",
            color: message.type === "success" ? "#065F46" : "#DC2626",
          }}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Actions Bar */}
      {statusFilter === "pending" && (
        <div
          className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" style={{ color: "#666666" }} />
            <label className="text-sm" style={{ color: "#666666" }}>Date d&apos;exécution:</label>
            <input
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#F5F5F7", border: "1px solid #EEEEEE", color: "#111111" }}
            />
          </div>

          <div className="flex-1" />

          <button
            onClick={generatePain001}
            disabled={generating || selectedIds.size === 0}
            className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#0891B2", color: "#FFFFFF" }}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Générer PAIN.001
          </button>
        </div>
      )}

      {statusFilter === "exported" && (
        <div
          className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <p className="text-sm" style={{ color: "#666666" }}>
            Après confirmation de votre banque, marquez les virements comme remboursés.
          </p>

          <div className="flex-1" />

          <button
            onClick={markAsRefunded}
            disabled={selectedIds.size === 0}
            className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#059669", color: "#FFFFFF" }}
          >
            <CheckCircle className="h-4 w-4" />
            Marquer comme remboursé
          </button>
        </div>
      )}

      {/* Credit Notes Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#0891B2" }} />
          </div>
        ) : creditNotes.length === 0 ? (
          <div className="text-center py-12">
            <Banknote className="h-12 w-12 mx-auto mb-4" style={{ color: "#CCCCCC" }} />
            <p className="text-lg font-medium" style={{ color: "#666666" }}>
              Aucun avoir trouvé
            </p>
            <p className="text-sm" style={{ color: "#999999" }}>
              Créez des avoirs depuis vos factures pour pouvoir effectuer des virements de remboursement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#F5F5F7" }}>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      {selectedIds.size === validNotesCount && validNotesCount > 0 ? (
                        <CheckSquare className="h-5 w-5" style={{ color: "#0891B2" }} />
                      ) : (
                        <Square className="h-5 w-5" style={{ color: "#999999" }} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Avoir
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Facture origine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Montant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                    Info SEPA
                  </th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((note) => (
                  <tr
                    key={note.id}
                    className="border-t transition-colors hover:bg-gray-50"
                    style={{ borderColor: "#EEEEEE" }}
                  >
                    <td className="px-4 py-3">
                      {note.hasValidSepaInfo ? (
                        <button
                          onClick={() => toggleSelect(note.id)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          {selectedIds.has(note.id) ? (
                            <CheckSquare className="h-5 w-5" style={{ color: "#0891B2" }} />
                          ) : (
                            <Square className="h-5 w-5" style={{ color: "#999999" }} />
                          )}
                        </button>
                      ) : (
                        <AlertTriangle className="h-5 w-5" style={{ color: "#F59E0B" }} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/factures/${note.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "#D97706" }}
                      >
                        {note.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${note.clientId}`}
                        className="hover:underline"
                        style={{ color: "#111111" }}
                      >
                        {note.clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {note.originalInvoiceId ? (
                        <Link
                          href={`/factures/${note.originalInvoiceId}`}
                          className="flex items-center gap-1 hover:underline text-sm"
                          style={{ color: "#0064FA" }}
                        >
                          <ArrowRight className="h-3 w-3" />
                          {note.originalInvoiceNumber}
                        </Link>
                      ) : (
                        <span style={{ color: "#999999" }}>-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "#111111" }}>
                      {note.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </td>
                    <td className="px-4 py-3">
                      {note.hasValidSepaInfo ? (
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ background: "#D1FAE5", color: "#065F46" }}
                        >
                          Complet
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{ background: "#FEF3C7", color: "#D97706" }}
                          >
                            Incomplet
                          </span>
                          <Link
                            href={`/clients/${note.clientId}/edit`}
                            className="text-xs underline"
                            style={{ color: "#0064FA" }}
                          >
                            Compléter
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Box */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#ECFEFF", border: "1px solid #0891B2" }}
      >
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "#0891B2" }}>
          <Building2 className="h-5 w-5" />
          Comment fonctionnent les virements SEPA ?
        </h3>
        <ol className="space-y-2 text-sm" style={{ color: "#0E7490" }}>
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Créez un avoir depuis une facture (bouton &quot;Créer un avoir&quot; sur la page facture)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Vérifiez que le client a bien ses informations bancaires (IBAN, BIC)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Sélectionnez les avoirs à rembourser et générez le fichier PAIN.001</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Importez le fichier dans votre espace bancaire en ligne</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">5.</span>
            <span>Une fois le virement effectué, marquez les avoirs comme remboursés</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
