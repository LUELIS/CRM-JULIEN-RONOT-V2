"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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

interface SubscriptionItem {
  id: string
  serviceId: string | null
  description: string
  quantity: number
  unit: string
  unitPriceHt: number
  taxRate: number
}

export default function NewSubscriptionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [clientId, setClientId] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [billingCycle, setBillingCycle] = useState("monthly")
  const [customDays, setCustomDays] = useState(30)
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState("")
  const [taxRate, setTaxRate] = useState(20)
  const [autoInvoice, setAutoInvoice] = useState(true)
  const [autoSend, setAutoSend] = useState(false)
  const [invoiceDaysBefore, setInvoiceDaysBefore] = useState(0)
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<SubscriptionItem[]>([
    {
      id: crypto.randomUUID(),
      serviceId: null,
      description: "",
      quantity: 1,
      unit: "unité",
      unitPriceHt: 0,
      taxRate: 20,
    },
  ])

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
                taxRate: service.vatRate,
                unit: service.unit,
              }
            : item
        )
      )
    }
  }

  const updateItem = (itemId: string, field: keyof SubscriptionItem, value: unknown) => {
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
        taxRate: taxRate,
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
      totalVat += lineHt * (item.taxRate / 100)
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

    if (!name) {
      alert("Veuillez saisir un nom pour l'abonnement")
      return
    }

    if (items.some((item) => !item.description)) {
      alert("Veuillez remplir toutes les descriptions")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          name,
          description,
          billingCycle,
          customDays: billingCycle === "custom" ? customDays : null,
          startDate,
          endDate: endDate || null,
          taxRate,
          autoInvoice,
          autoSend,
          invoiceDaysBefore,
          notes,
          items: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceHt: item.unitPriceHt,
            taxRate: item.taxRate,
            serviceId: item.serviceId,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/subscriptions/${data.id}`)
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la création")
      }
    } catch (error) {
      console.error("Error creating subscription:", error)
      alert("Erreur lors de la création de l'abonnement")
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
        <Link href="/subscriptions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouvel abonnement</h1>
          <p className="text-muted-foreground">Créer un nouvel abonnement récurrent</p>
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
                  <Label htmlFor="name">Nom de l&apos;abonnement *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maintenance mensuelle"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description courte de l'abonnement"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billingCycle">Cycle de facturation</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="quarterly">Trimestriel</SelectItem>
                      <SelectItem value="biannual">Semestriel</SelectItem>
                      <SelectItem value="yearly">Annuel</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {billingCycle === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="customDays">Jours personnalisés</Label>
                    <Input
                      type="number"
                      id="customDays"
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                      min="1"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="startDate">Date de début *</Label>
                  <Input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Date de fin (optionnelle)</Label>
                  <Input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate">Taux de TVA par défaut</Label>
                  <Select
                    value={taxRate.toString()}
                    onValueChange={(v) => setTaxRate(parseFloat(v))}
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
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Options de facturation</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Facturation automatique</Label>
                    <p className="text-sm text-muted-foreground">
                      Générer les factures automatiquement
                    </p>
                  </div>
                  <Switch checked={autoInvoice} onCheckedChange={setAutoInvoice} />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label>Envoi automatique</Label>
                    <p className="text-sm text-muted-foreground">
                      Envoyer les factures par email
                    </p>
                  </div>
                  <Switch checked={autoSend} onCheckedChange={setAutoSend} />
                </div>

                {autoInvoice && (
                  <div className="space-y-2">
                    <Label htmlFor="invoiceDaysBefore">Jours avant facturation</Label>
                    <Input
                      type="number"
                      id="invoiceDaysBefore"
                      value={invoiceDaysBefore}
                      onChange={(e) => setInvoiceDaysBefore(parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Éléments récurrents</h2>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un élément
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
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
                        value={item.taxRate.toString()}
                        onValueChange={(v) => updateItem(item.id, "taxRate", parseFloat(v))}
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
                placeholder="Notes ou informations complémentaires..."
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
                <p className="text-xs text-muted-foreground">
                  Par{" "}
                  {billingCycle === "monthly"
                    ? "mois"
                    : billingCycle === "quarterly"
                    ? "trimestre"
                    : billingCycle === "biannual"
                    ? "semestre"
                    : billingCycle === "yearly"
                    ? "an"
                    : `${customDays} jours`}
                </p>
              </div>

              <div className="pt-4 space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Création..." : "Créer l'abonnement"}
                </Button>
                <Link href="/subscriptions" className="block">
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
