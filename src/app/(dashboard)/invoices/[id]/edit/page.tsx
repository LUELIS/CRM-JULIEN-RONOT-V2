"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Save, Calculator } from "lucide-react"

interface Client {
  id: string
  companyName: string
  email: string
  address: string
  city: string
  postalCode: string
}

interface Service {
  id: string
  name: string
  description: string | null
  priceHt: number
  vatRate: number
}

interface InvoiceLine {
  id: string
  serviceId: string | null
  description: string
  quantity: number
  unitPriceHt: number
  vatRate: number
  totalHt: number
  totalTtc: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  clientId: string
  issueDate: string
  dueDate: string
  paymentTerms: number
  notes: string | null
  items: InvoiceLine[]
}

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clientId, setClientId] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("30")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState("draft")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [lines, setLines] = useState<InvoiceLine[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceRes, clientsRes, servicesRes] = await Promise.all([
          fetch(`/api/invoices/${id}`),
          fetch("/api/clients?perPage=100"),
          fetch("/api/services?perPage=100"),
        ])

        if (!invoiceRes.ok) {
          router.push("/invoices")
          return
        }

        const invoice: Invoice = await invoiceRes.json()
        const clientsData = await clientsRes.json()
        const servicesData = await servicesRes.json()

        setClients(clientsData.clients || [])
        setServices(servicesData.services || [])

        // Populate form with invoice data
        setClientId(invoice.clientId)
        setIssueDate(invoice.issueDate.split("T")[0])
        setDueDate(invoice.dueDate.split("T")[0])
        setPaymentTerms(invoice.paymentTerms?.toString() || "30")
        setNotes(invoice.notes || "")
        setStatus(invoice.status)
        setInvoiceNumber(invoice.invoiceNumber)

        // Transform items to lines
        const invoiceLines = invoice.items.map((item) => ({
          id: item.id || crypto.randomUUID(),
          serviceId: item.serviceId,
          description: item.description,
          quantity: item.quantity,
          unitPriceHt: item.unitPriceHt,
          vatRate: item.vatRate,
          totalHt: item.totalHt,
          totalTtc: item.totalTtc,
        }))

        setLines(invoiceLines.length > 0 ? invoiceLines : [{
          id: crypto.randomUUID(),
          serviceId: null,
          description: "",
          quantity: 1,
          unitPriceHt: 0,
          vatRate: 20,
          totalHt: 0,
          totalTtc: 0,
        }])
      } catch (error) {
        console.error("Error loading invoice:", error)
        router.push("/invoices")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  const calculateLineTotals = (line: InvoiceLine): InvoiceLine => {
    const totalHt = line.quantity * line.unitPriceHt
    const totalTtc = totalHt * (1 + line.vatRate / 100)
    return { ...line, totalHt, totalTtc }
  }

  const updateLine = (lineId: string, field: keyof InvoiceLine, value: string | number | null) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line
        const updated = { ...line, [field]: value }
        return calculateLineTotals(updated)
      })
    )
  }

  const selectService = (lineId: string, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    if (!service) return

    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line
        const updated = {
          ...line,
          serviceId,
          description: service.name + (service.description ? ` - ${service.description}` : ""),
          unitPriceHt: service.priceHt,
          vatRate: service.vatRate,
        }
        return calculateLineTotals(updated)
      })
    )
  }

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        serviceId: null,
        description: "",
        quantity: 1,
        unitPriceHt: 0,
        vatRate: 20,
        totalHt: 0,
        totalTtc: 0,
      },
    ])
  }

  const removeLine = (lineId: string) => {
    if (lines.length === 1) return
    setLines((prev) => prev.filter((line) => line.id !== lineId))
  }

  const totals = lines.reduce(
    (acc, line) => ({
      totalHt: acc.totalHt + line.totalHt,
      totalVat: acc.totalVat + (line.totalTtc - line.totalHt),
      totalTtc: acc.totalTtc + line.totalTtc,
    }),
    { totalHt: 0, totalVat: 0, totalTtc: 0 }
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent, newStatus?: string) => {
    e.preventDefault()
    if (!clientId) {
      alert("Veuillez sélectionner un client")
      return
    }
    if (lines.every((l) => !l.description)) {
      alert("Veuillez ajouter au moins une ligne de facture")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          issueDate,
          dueDate,
          paymentTerms: parseInt(paymentTerms),
          notes,
          status: newStatus || status,
          items: lines.map((line) => ({
            serviceId: line.serviceId,
            description: line.description,
            quantity: line.quantity,
            unitPriceHt: line.unitPriceHt,
            vatRate: line.vatRate,
          })),
        }),
      })

      if (response.ok) {
        router.push(`/invoices/${id}`)
      } else {
        const error = await response.json()
        alert(error.error || "Erreur lors de la mise à jour de la facture")
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la mise à jour de la facture")
    } finally {
      setSaving(false)
    }
  }

  const selectedClient = clients.find((c) => c.id === clientId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/invoices/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifier {invoiceNumber}
          </h1>
          <p className="text-muted-foreground">
            Modifiez les informations de la facture
          </p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Client</CardTitle>
                <CardDescription>
                  Client associé à cette facture
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
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
                  {selectedClient && (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{selectedClient.companyName}</p>
                      <p className="text-muted-foreground">{selectedClient.email}</p>
                      <p className="text-muted-foreground">
                        {selectedClient.address}
                        {selectedClient.postalCode && `, ${selectedClient.postalCode}`}
                        {selectedClient.city && ` ${selectedClient.city}`}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Lines */}
            <Card>
              <CardHeader>
                <CardTitle>Lignes de facture</CardTitle>
                <CardDescription>
                  Prestations facturées
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="grid gap-4 p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ligne {index + 1}</span>
                      {lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Service</Label>
                        <Select
                          value={line.serviceId || ""}
                          onValueChange={(v) => selectService(line.id, v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un service" />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map((service) => (
                              <SelectItem key={service.id} value={service.id}>
                                {service.name} - {formatCurrency(service.priceHt)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Input
                          value={line.description}
                          onChange={(e) =>
                            updateLine(line.id, "description", e.target.value)
                          }
                          placeholder="Description de la prestation"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Quantité</Label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prix unitaire HT</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPriceHt}
                          onChange={(e) =>
                            updateLine(line.id, "unitPriceHt", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TVA (%)</Label>
                        <Select
                          value={line.vatRate.toString()}
                          onValueChange={(v) => updateLine(line.id, "vatRate", parseFloat(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5.5">5.5%</SelectItem>
                            <SelectItem value="10">10%</SelectItem>
                            <SelectItem value="20">20%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Total HT</Label>
                        <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center font-medium">
                          {formatCurrency(line.totalHt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addLine} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes ou conditions particulières..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Date d'émission</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Délai de paiement</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Paiement immédiat</SelectItem>
                      <SelectItem value="15">15 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="45">45 jours</SelectItem>
                      <SelectItem value="60">60 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Date d'échéance</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Totaux
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total HT</span>
                  <span className="font-medium">{formatCurrency(totals.totalHt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA</span>
                  <span className="font-medium">{formatCurrency(totals.totalVat)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold">Total TTC</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(totals.totalTtc)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
                {status === "draft" && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={saving}
                    onClick={(e) => handleSubmit(e, "sent")}
                  >
                    Enregistrer et envoyer
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <Link href={`/invoices/${id}`}>Annuler</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
