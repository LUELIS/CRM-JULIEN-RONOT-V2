"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  MoreHorizontal,
  Edit,
  Trash2,
  Pause,
  Play,
  XCircle,
  FileText,
  Calendar,
  Building2,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Receipt,
  Clock,
  Euro,
} from "lucide-react"

interface SubscriptionItem {
  id: string
  serviceId: string | null
  description: string
  quantity: number
  unit: string
  unitPriceHt: number
  taxRate: number
  totalHt: number
  totalTtc: number
}

interface Client {
  id: string
  companyName: string
  email: string
  phone: string | null
  address: string | null
  postalCode: string | null
  city: string | null
  country: string | null
  siret: string | null
  vatNumber: string | null
}

interface LastInvoice {
  id: string
  invoiceNumber: string
  status: string
  totalTtc: number
}

interface Subscription {
  id: string
  subscriptionNumber: string
  name: string
  description: string | null
  status: "active" | "paused" | "cancelled" | "expired"
  billingCycle: string
  customDays: number | null
  startDate: string
  nextBillingDate: string
  endDate: string | null
  amountHt: number
  taxRate: number
  amountTtc: number
  autoInvoice: boolean
  autoSend: boolean
  invoiceDaysBefore: number
  lastInvoiceDate: string | null
  lastInvoiceId: string | null
  totalInvoicesGenerated: number
  notes: string | null
  clientId: string
  client: Client
  items: SubscriptionItem[]
  lastInvoice: LastInvoice | null
}

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSubscription(data)
      } else {
        router.push("/subscriptions")
      }
    } catch (error) {
      console.error("Error fetching subscription:", error)
      router.push("/subscriptions")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        const data = await res.json()
        if (action === "generateInvoice" && data.invoiceId) {
          router.push(`/invoices/${data.invoiceId}`)
        } else {
          fetchSubscription()
        }
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'action")
      }
    } catch (error) {
      console.error("Error performing action:", error)
      alert("Erreur lors de l'action")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/subscriptions")
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting subscription:", error)
      alert("Erreur lors de la suppression")
    } finally {
      setActionLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Actif" },
      paused: { variant: "secondary", label: "En pause" },
      cancelled: { variant: "destructive", label: "Annulé" },
      expired: { variant: "outline", label: "Expiré" },
    }
    const config = variants[status] || { variant: "outline" as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getBillingCycleLabel = (cycle: string, customDays?: number | null) => {
    const labels: Record<string, string> = {
      monthly: "Mensuel",
      quarterly: "Trimestriel",
      biannual: "Semestriel",
      yearly: "Annuel",
      custom: customDays ? `Tous les ${customDays} jours` : "Personnalisé",
    }
    return labels[cycle] || cycle
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (!subscription) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/subscriptions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{subscription.subscriptionNumber}</h1>
              {getStatusBadge(subscription.status)}
            </div>
            <p className="text-muted-foreground">{subscription.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {subscription.status === "active" && (
            <Button
              variant="outline"
              onClick={() => handleAction("generateInvoice")}
              disabled={actionLoading}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Générer une facture
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={actionLoading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/subscriptions/${id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {subscription.status === "active" && (
                <DropdownMenuItem onClick={() => handleAction("pause")}>
                  <Pause className="h-4 w-4 mr-2" />
                  Mettre en pause
                </DropdownMenuItem>
              )}

              {subscription.status === "paused" && (
                <DropdownMenuItem onClick={() => handleAction("resume")}>
                  <Play className="h-4 w-4 mr-2" />
                  Reprendre
                </DropdownMenuItem>
              )}

              {(subscription.status === "active" || subscription.status === "paused") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Annuler l&apos;abonnement
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Informations de l'abonnement */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Informations de l&apos;abonnement
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cycle de facturation</p>
                <p className="font-medium">
                  {getBillingCycleLabel(subscription.billingCycle, subscription.customDays)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de début</p>
                <p className="font-medium">{formatDate(subscription.startDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prochaine facturation</p>
                <p className="font-medium">{formatDate(subscription.nextBillingDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de fin</p>
                <p className="font-medium">
                  {subscription.endDate ? formatDate(subscription.endDate) : "Indéterminée"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Factures auto</p>
                <p className="font-medium">{subscription.autoInvoice ? "Oui" : "Non"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Envoi auto</p>
                <p className="font-medium">{subscription.autoSend ? "Oui" : "Non"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jours avant facturation</p>
                <p className="font-medium">{subscription.invoiceDaysBefore}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Factures générées</p>
                <p className="font-medium">{subscription.totalInvoicesGenerated}</p>
              </div>
            </div>

            {subscription.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{subscription.description}</p>
              </div>
            )}
          </div>

          {/* Lignes de l'abonnement */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lignes de l&apos;abonnement
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Description</th>
                    <th className="text-right p-3 text-sm font-medium">Qté</th>
                    <th className="text-right p-3 text-sm font-medium">Prix HT</th>
                    <th className="text-right p-3 text-sm font-medium">TVA</th>
                    <th className="text-right p-3 text-sm font-medium">Total HT</th>
                    <th className="text-right p-3 text-sm font-medium">Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {subscription.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">
                        <span className="font-medium">{item.description}</span>
                      </td>
                      <td className="p-3 text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-3 text-right">{formatCurrency(item.unitPriceHt)}</td>
                      <td className="p-3 text-right">{item.taxRate}%</td>
                      <td className="p-3 text-right">{formatCurrency(item.totalHt)}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(item.totalTtc)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/50">
                  <tr className="border-t">
                    <td colSpan={4} className="p-3 text-right font-medium">
                      Sous-total HT
                    </td>
                    <td colSpan={2} className="p-3 text-right font-medium">
                      {formatCurrency(subscription.amountHt)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="p-3 text-right font-medium">
                      TVA ({subscription.taxRate}%)
                    </td>
                    <td colSpan={2} className="p-3 text-right font-medium">
                      {formatCurrency(subscription.amountTtc - subscription.amountHt)}
                    </td>
                  </tr>
                  <tr className="text-lg">
                    <td colSpan={4} className="p-3 text-right font-bold">
                      Total TTC
                    </td>
                    <td colSpan={2} className="p-3 text-right font-bold">
                      {formatCurrency(subscription.amountTtc)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {subscription.notes && (
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Notes</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">{subscription.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Montant récurrent */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Euro className="h-5 w-5" />
              Montant récurrent
            </h2>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(subscription.amountTtc)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {getBillingCycleLabel(subscription.billingCycle, subscription.customDays)}
            </p>
          </div>

          {/* Client */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5" />
              Client
            </h2>
            <div className="space-y-3">
              <div>
                <Link
                  href={`/clients/${subscription.client.id}`}
                  className="font-medium hover:underline"
                >
                  {subscription.client.companyName}
                </Link>
              </div>

              {subscription.client.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${subscription.client.email}`} className="hover:underline">
                    {subscription.client.email}
                  </a>
                </div>
              )}

              {subscription.client.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${subscription.client.phone}`} className="hover:underline">
                    {subscription.client.phone}
                  </a>
                </div>
              )}

              {subscription.client.address && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <div>
                    <p>{subscription.client.address}</p>
                    <p>
                      {subscription.client.postalCode} {subscription.client.city}
                    </p>
                    {subscription.client.country && <p>{subscription.client.country}</p>}
                  </div>
                </div>
              )}

              {(subscription.client.siret || subscription.client.vatNumber) && (
                <div className="pt-3 border-t space-y-1">
                  {subscription.client.siret && (
                    <p className="text-xs text-muted-foreground">
                      SIRET: {subscription.client.siret}
                    </p>
                  )}
                  {subscription.client.vatNumber && (
                    <p className="text-xs text-muted-foreground">
                      TVA: {subscription.client.vatNumber}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dernière facture */}
          {subscription.lastInvoice && (
            <div className="bg-card border rounded-lg p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5" />
                Dernière facture
              </h2>
              <div className="space-y-2">
                <Link
                  href={`/invoices/${subscription.lastInvoice.id}`}
                  className="font-medium hover:underline block"
                >
                  {subscription.lastInvoice.invoiceNumber}
                </Link>
                <div className="flex justify-between items-center">
                  <Badge variant="outline">{subscription.lastInvoice.status}</Badge>
                  <span className="font-medium">
                    {formatCurrency(subscription.lastInvoice.totalTtc)}
                  </span>
                </div>
                {subscription.lastInvoiceDate && (
                  <p className="text-sm text-muted-foreground">
                    Générée le {formatDate(subscription.lastInvoiceDate)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5" />
              Dates clés
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Début</span>
                <span className="font-medium">{formatDate(subscription.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prochaine facture</span>
                <span className="font-medium">{formatDate(subscription.nextBillingDate)}</span>
              </div>
              {subscription.endDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fin prévue</span>
                  <span className="font-medium">{formatDate(subscription.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;abonnement</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet abonnement ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler l&apos;abonnement</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler cet abonnement ? L&apos;abonnement sera marqué comme
              annulé et ne générera plus de factures.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCancelDialogOpen(false)
                handleAction("cancel")
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Annuler l&apos;abonnement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
