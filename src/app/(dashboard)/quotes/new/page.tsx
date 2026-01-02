"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"

interface Client {
  id: string
  companyName: string
  email: string
}

interface Service {
  id: string
  name: string
  priceHt: number
  vatRate: number
  unit: string
}

interface QuoteItem {
  id: string
  serviceId: string | null
  description: string
  quantity: number
  unit: string
  unitPriceHt: number
  vatRate: number
}

export default function NewQuotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [clientId, setClientId] = useState("")
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0])
  const [validityDays, setValidityDays] = useState(30)
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: crypto.randomUUID(),
      serviceId: null,
      description: "",
      quantity: 1,
      unit: "unité",
      unitPriceHt: 0,
      vatRate: 20,
    },
  ])

  useEffect(() => {
    const date = new Date(issueDate)
    date.setDate(date.getDate() + validityDays)
    setValidUntil(date.toISOString().split("T")[0])
  }, [issueDate, validityDays])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients?perPage=500")
      const data = await res.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }, [])

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/services?perPage=500")
      const data = await res.json()
      setServices(data.services || [])
    } catch (error) {
      console.error("Error fetching services:", error)
    }
  }, [])

  useEffect(() => {
    fetchClients()
    fetchServices()
  }, [fetchClients, fetchServices])

  const handleServiceSelect = (itemId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    if (service) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                serviceId,
                description: service.name,
                unitPriceHt: service.priceHt,
                vatRate: service.vatRate,
                unit: service.unit,
              }
            : item
        )
      )
    }
  }

  const updateItem = (itemId: string, field: keyof QuoteItem, value: unknown) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item))
    )
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        serviceId: null,
        description: "",
        quantity: 1,
        unit: "unité",
        unitPriceHt: 0,
        vatRate: 20,
      },
    ])
  }

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((item) => item.id !== itemId))
    }
  }

  const calculateTotals = () => {
    let totalHt = 0
    let totalVat = 0

    items.forEach((item) => {
      const lineHt = item.quantity * item.unitPriceHt
      totalHt += lineHt
      totalVat += lineHt * (item.vatRate / 100)
    })

    return {
      totalHt,
      totalVat,
      totalTtc: totalHt + totalVat,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientId) {
      alert("Veuillez sélectionner un client")
      return
    }

    if (items.some((item) => !item.description)) {
      alert("Veuillez remplir toutes les descriptions")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          issueDate,
          validUntil,
          notes,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceHt: item.unitPriceHt,
            vatRate: item.vatRate,
            serviceId: item.serviceId,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/quotes/${data.id}`)
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la création")
      }
    } catch (error) {
      console.error("Error creating quote:", error)
      alert("Erreur lors de la création du devis")
    } finally {
      setLoading(false)
    }
  }

  const { totalHt, totalVat, totalTtc } = calculateTotals()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau devis</h1>
          <p className="text-muted-foreground">Créer un nouveau devis client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Informations générales</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client *</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueDate">Date d&apos;émission</Label>
                  <Input
                    type="date"
                    id="issueDate"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validityDays">Validité (jours)</Label>
                  <Select
                    value={validityDays.toString()}
                    onValueChange={(v) => setValidityDays(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="45">45 jours</SelectItem>
                      <SelectItem value="60">60 jours</SelectItem>
                      <SelectItem value="90">90 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validUntil">Valide jusqu&apos;au</Label>
                  <Input
                    type="date"
                    id="validUntil"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Lignes du devis</h2>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-3 items-start p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="col-span-12 md:col-span-4 space-y-2">
                      <Label className="text-xs">Service</Label>
                      <Select
                        value={item.serviceId || "custom"}
                        onValueChange={(v) =>
                          v === "custom"
                            ? updateItem(item.id, "serviceId", null)
                            : handleServiceSelect(item.id, v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner ou personnaliser" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Personnalisé</SelectItem>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - {formatCurrency(service.priceHt)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      />
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-2">
                      <Label className="text-xs">Quantité</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-2">
                      <Label className="text-xs">Prix HT</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPriceHt}
                        onChange={(e) =>
                          updateItem(item.id, "unitPriceHt", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="col-span-4 md:col-span-2 space-y-2">
                      <Label className="text-xs">TVA %</Label>
                      <Select
                        value={item.vatRate.toString()}
                        onValueChange={(v) => updateItem(item.id, "vatRate", parseFloat(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="5.5">5,5%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="20">20%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-10 md:col-span-1 space-y-2">
                      <Label className="text-xs">Total HT</Label>
                      <div className="h-10 flex items-center text-sm font-medium">
                        {formatCurrency(item.quantity * item.unitPriceHt)}
                      </div>
                    </div>

                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <Label className="text-xs opacity-0">Action</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Notes</h2>
              <Textarea
                placeholder="Notes ou conditions particulières..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-6 space-y-4 sticky top-4">
              <h2 className="text-lg font-semibold">Récapitulatif</h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span>{formatCurrency(totalHt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA</span>
                  <span>{formatCurrency(totalVat)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                  <span>Total TTC</span>
                  <span>{formatCurrency(totalTtc)}</span>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Création..." : "Créer le devis"}
                </Button>
                <Link href="/quotes" className="block">
                  <Button type="button" variant="outline" className="w-full">
                    Annuler
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
