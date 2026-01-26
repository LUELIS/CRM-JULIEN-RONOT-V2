"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  RefreshCw,
  Users,
  FileText,
  Play,
  Check,
  Euro,
  DollarSign,
  Minus,
  Plus,
  Pencil,
  X,
  AlertCircle,
} from "lucide-react"

interface Service {
  id: string
  clientServiceId: string
  code: string
  name: string
  priceHT: number
  unitPriceHT: number
  vatRate: number
  priceTTC: number
  quantity: number
  unit: string
  category: {
    id: string
    name: string
    color: string
  } | null
}

interface Client {
  id: string
  companyName: string
  email: string
  status: string
  invoiceCount: number
  services: Service[]
  mrr_ht: number
  mrr_ttc: number
}

interface Totals {
  mrr_ht: number
  mrr_ttc: number
  clientCount: number
  serviceCount: number
}

export default function RecurringPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [totals, setTotals] = useState<Totals>({
    mrr_ht: 0,
    mrr_ttc: 0,
    clientCount: 0,
    serviceCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/recurring")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients)
        setTotals(data.totals)
      }
    } catch (error) {
      console.error("Error fetching recurring data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const generateInvoices = async () => {
    if (
      !confirm(
        "Voulez-vous générer des factures en brouillon pour tous les clients avec services récurrents ?"
      )
    ) {
      return
    }

    setGenerating(true)
    setMessage(null)
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateInvoices" }),
      })

      const data = await res.json()

      if (res.ok) {
        let messageText = data.message || `${data.generatedCount} facture(s) générée(s)`
        if (data.errors && data.errors.length > 0) {
          messageText += ` (${data.errors.length} erreur(s))`
        }
        setMessage({
          type: data.generatedCount > 0 ? "success" : "error",
          text: messageText,
        })
      } else {
        setMessage({
          type: "error",
          text: data.error || "Erreur lors de la génération",
        })
      }
    } catch {
      setMessage({
        type: "error",
        text: "Erreur lors de la génération des factures",
      })
    } finally {
      setGenerating(false)
    }
  }

  const updateQuantity = async (clientId: string, serviceId: string, newQuantity: number) => {
    if (newQuantity < 0.01) return

    // Optimistic update with recalculated totals
    setClients((prev) =>
      prev.map((client) => {
        if (client.id !== clientId) return client
        const updatedServices = client.services.map((s) => {
          if (s.id !== serviceId) return s
          const newPriceHT = s.unitPriceHT * newQuantity
          const newPriceTTC = newPriceHT * (1 + s.vatRate / 100)
          return { ...s, quantity: newQuantity, priceHT: newPriceHT, priceTTC: newPriceTTC }
        })
        const newMrrHT = updatedServices.reduce((sum, s) => sum + s.priceHT, 0)
        const newMrrTTC = updatedServices.reduce((sum, s) => sum + s.priceTTC, 0)
        return { ...client, services: updatedServices, mrr_ht: newMrrHT, mrr_ttc: newMrrTTC }
      })
    )

    // Recalculate totals
    setTotals((prev) => {
      const newClients = clients.map((client) => {
        if (client.id !== clientId) return client
        const updatedServices = client.services.map((s) => {
          if (s.id !== serviceId) return s
          return { ...s, quantity: newQuantity, priceHT: s.unitPriceHT * newQuantity }
        })
        return { ...client, mrr_ht: updatedServices.reduce((sum, s) => sum + s.priceHT, 0) }
      })
      return {
        ...prev,
        mrr_ht: newClients.reduce((sum, c) => sum + c.mrr_ht, 0),
        mrr_ttc: newClients.reduce((sum, c) => sum + c.mrr_ttc, 0),
      }
    })

    try {
      const res = await fetch(`/api/clients/${clientId}/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity, isActive: true }),
      })

      if (!res.ok) {
        fetchData() // Reload on error
      }
    } catch (error) {
      console.error("Error updating quantity:", error)
      fetchData() // Reload on error
    }
  }

  const updatePrice = async (clientId: string, serviceId: string, newPrice: number) => {
    if (newPrice < 0) return

    // Optimistic update with recalculated totals
    setClients((prev) =>
      prev.map((client) => {
        if (client.id !== clientId) return client
        const updatedServices = client.services.map((s) => {
          if (s.id !== serviceId) return s
          const newPriceHT = newPrice * s.quantity
          const newPriceTTC = newPriceHT * (1 + s.vatRate / 100)
          return { ...s, unitPriceHT: newPrice, priceHT: newPriceHT, priceTTC: newPriceTTC }
        })
        const newMrrHT = updatedServices.reduce((sum, s) => sum + s.priceHT, 0)
        const newMrrTTC = updatedServices.reduce((sum, s) => sum + s.priceTTC, 0)
        return { ...client, services: updatedServices, mrr_ht: newMrrHT, mrr_ttc: newMrrTTC }
      })
    )

    try {
      const res = await fetch(`/api/clients/${clientId}/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPriceHt: newPrice, isActive: true }),
      })

      if (!res.ok) {
        fetchData() // Reload on error
      }
    } catch (error) {
      console.error("Error updating price:", error)
      fetchData() // Reload on error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="h-10 w-10 border-4 rounded-full animate-spin"
          style={{ borderColor: "#EEEEEE", borderTopColor: "#0064FA" }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - Style sobre */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
            Revenus Récurrents (MRR)
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            Aperçu des revenus mensuels récurrents par client
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/clients">
            <button
              className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:opacity-80"
              style={{ background: "#F5F5F7", color: "#666666" }}
            >
              <Users className="h-4 w-4" />
              Voir les clients
            </button>
          </Link>
          {clients.length > 0 && (
            <button
              onClick={generateInvoices}
              disabled={generating}
              className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50 hover:opacity-90"
              style={{ background: "#0064FA", color: "#FFFFFF" }}
            >
              {generating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {generating ? "Génération..." : "Générer les factures"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div
          className="p-4 rounded-xl flex items-center justify-between"
          style={{
            background: message.type === "success" ? "#D4EDDA" : "#FEE2E8",
            border: `1px solid ${message.type === "success" ? "#28B95F" : "#F04B69"}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: message.type === "success" ? "#28B95F" : "#F04B69" }}
            >
              {message.type === "success" ? (
                <Check className="h-5 w-5" style={{ color: "#FFFFFF" }} />
              ) : (
                <AlertCircle className="h-5 w-5" style={{ color: "#FFFFFF" }} />
              )}
            </div>
            <p
              className="font-medium"
              style={{ color: message.type === "success" ? "#28B95F" : "#F04B69" }}
            >
              {message.text}
            </p>
          </div>
          <button onClick={() => setMessage(null)} className="hover:opacity-70 transition-opacity">
            <X className="h-4 w-4" style={{ color: message.type === "success" ? "#28B95F" : "#F04B69" }} />
          </button>
        </div>
      )}

      {/* Stats Cards - Icon on RIGHT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MRR Total HT */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>
                MRR Total HT
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#111111" }}>
                {formatCurrency(totals.mrr_ht)} €
              </p>
              <p className="text-xs mt-2" style={{ color: "#999999" }}>
                Hors taxes
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#E3F2FD" }}
            >
              <DollarSign className="w-6 h-6" style={{ color: "#0064FA" }} />
            </div>
          </div>
        </div>

        {/* MRR Total TTC */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>
                MRR Total TTC
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#28B95F" }}>
                {formatCurrency(totals.mrr_ttc)} €
              </p>
              <p className="text-xs mt-2" style={{ color: "#999999" }}>
                Toutes taxes comprises
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#D4EDDA" }}
            >
              <Euro className="w-6 h-6" style={{ color: "#28B95F" }} />
            </div>
          </div>
        </div>

        {/* Clients récurrents */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: "#666666" }}>
                Clients récurrents
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "#111111" }}>
                {totals.clientCount}
              </p>
              <p className="text-xs mt-2" style={{ color: "#999999" }}>
                Avec services actifs
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "#F3E8FF" }}
            >
              <Users className="w-6 h-6" style={{ color: "#5F00BA" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {clients.length === 0 ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="text-center py-16">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "#F5F5F7" }}
              >
                <RefreshCw className="h-10 w-10" style={{ color: "#999999" }} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: "#111111" }}>
                Aucun revenu récurrent
              </h3>
              <p className="mb-6 max-w-md mx-auto" style={{ color: "#666666" }}>
                Aucun client n'a de services récurrents actifs pour le moment. Ajoutez des services
                récurrents à vos clients pour les voir apparaître ici.
              </p>
              <Link href="/clients">
                <button
                  className="px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: "#0064FA", color: "#FFFFFF" }}
                >
                  <Users className="h-5 w-5 mr-2 inline" />
                  Voir les clients
                </button>
              </Link>
            </div>
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              {/* Client Header */}
              <div className="px-6 py-4" style={{ borderBottom: "1px solid #EEEEEE" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mr-4"
                      style={{ background: "#F5F5F7" }}
                    >
                      <span className="font-bold text-sm" style={{ color: "#666666" }}>
                        {client.companyName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold" style={{ color: "#111111" }}>
                        <Link
                          href={`/clients/${client.id}`}
                          className="hover:underline"
                          style={{ color: "#111111" }}
                        >
                          {client.companyName}
                        </Link>
                      </h3>
                      {client.email && (
                        <p className="text-sm" style={{ color: "#666666" }}>
                          {client.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase font-medium mb-1" style={{ color: "#999999" }}>
                      MRR Client
                    </p>
                    <p className="text-lg font-semibold" style={{ color: "#111111" }}>
                      {formatCurrency(client.mrr_ht)} € HT
                    </p>
                    <p className="text-lg font-semibold" style={{ color: "#28B95F" }}>
                      {formatCurrency(client.mrr_ttc)} € TTC
                    </p>
                  </div>
                </div>
              </div>

              {/* Services Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#FAFAFA" }}>
                      <th
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Service
                      </th>
                      <th
                        className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Quantité
                      </th>
                      <th
                        className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Prix Unit. HT
                      </th>
                      <th
                        className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Total HT
                      </th>
                      <th
                        className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        TVA
                      </th>
                      <th
                        className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Total TTC
                      </th>
                      <th
                        className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "#666666" }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.services.map((service, idx) => {
                      return (
                        <tr
                          key={service.id}
                          className="hover:bg-[#FAFAFA] transition-colors"
                          style={{ borderBottom: idx < client.services.length - 1 ? "1px solid #EEEEEE" : "none" }}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium" style={{ color: "#111111" }}>
                                {service.name}
                              </p>
                              {service.category && (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mt-1"
                                  style={{
                                    backgroundColor: `${service.category.color}20`,
                                    color: service.category.color,
                                  }}
                                >
                                  {service.category.name}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    client.id,
                                    service.id,
                                    Math.max(0.01, service.quantity - 1)
                                  )
                                }
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
                                style={{ background: "#F5F5F7", color: "#666666" }}
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                value={service.quantity}
                                onChange={(e) =>
                                  updateQuantity(
                                    client.id,
                                    service.id,
                                    parseFloat(e.target.value) || 0.01
                                  )
                                }
                                step="0.01"
                                min="0.01"
                                className="w-20 text-center px-2 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
                                style={{
                                  background: "#FFFFFF",
                                  border: "1px solid #EEEEEE",
                                  color: "#111111",
                                }}
                              />
                              <button
                                onClick={() =>
                                  updateQuantity(client.id, service.id, service.quantity + 1)
                                }
                                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
                                style={{ background: "#F5F5F7", color: "#666666" }}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={service.unitPriceHT}
                                onChange={(e) =>
                                  updatePrice(
                                    client.id,
                                    service.id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                step="0.01"
                                min="0"
                                className="w-24 text-right px-2 py-1.5 rounded-lg text-sm font-medium focus:outline-none"
                                style={{
                                  background: "#FFFFFF",
                                  border: "1px solid #EEEEEE",
                                  color: "#111111",
                                }}
                              />
                              <span className="text-sm" style={{ color: "#666666" }}>€</span>
                            </div>
                          </td>
                          <td
                            className="px-6 py-4 text-right text-sm font-semibold"
                            style={{ color: "#111111" }}
                          >
                            {formatCurrency(service.priceHT)} €
                          </td>
                          <td
                            className="px-6 py-4 text-right text-sm"
                            style={{ color: "#999999" }}
                          >
                            {service.vatRate}%
                          </td>
                          <td
                            className="px-6 py-4 text-right text-sm font-semibold"
                            style={{ color: "#28B95F" }}
                          >
                            {formatCurrency(service.priceTTC)} €
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link
                              href={`/clients/${client.id}#services`}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                              style={{ background: "#F5F5F7", color: "#666666" }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Éditer
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      {clients.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ background: "#F5F5F7", border: "1px solid #EEEEEE" }}
        >
          <div className="flex gap-3">
            <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#666666" }} />
            <div className="text-sm" style={{ color: "#666666" }}>
              <p className="font-medium mb-1" style={{ color: "#444444" }}>Génération de factures récurrentes</p>
              <p>
                Cliquez sur "Générer les factures" pour créer des factures en brouillon pour tous
                les clients avec services récurrents. Les factures seront créées avec les services
                et quantités affichés ci-dessus.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
