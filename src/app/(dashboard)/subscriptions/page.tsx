"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileText,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  Calendar,
  TrendingUp,
} from "lucide-react"

interface Subscription {
  id: string
  subscriptionNumber: string
  name: string
  description: string | null
  status: string
  billingCycle: string
  startDate: string
  nextBillingDate: string
  endDate: string | null
  amountHt: number
  amountTtc: number
  taxRate: number
  autoInvoice: boolean
  autoSend: boolean
  totalInvoicesGenerated: number
  client: {
    id: string
    companyName: string
    email: string | null
  }
}

interface Stats {
  total: number
  active: number
  paused: number
  cancelled: number
  expired: number
  activeAmount: number
  mrr: number
}

interface Pagination {
  page: number
  perPage: number
  total: number
  totalPages: number
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Actif", variant: "default" },
  paused: { label: "En pause", variant: "secondary" },
  cancelled: { label: "Annulé", variant: "destructive" },
  expired: { label: "Expiré", variant: "outline" },
}

const billingCycleLabels: Record<string, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  biannual: "Semestriel",
  yearly: "Annuel",
  custom: "Personnalisé",
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    paused: 0,
    cancelled: 0,
    expired: 0,
    activeAmount: 0,
    mrr: 0,
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    perPage: 15,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        perPage: pagination.perPage.toString(),
      })
      if (search) params.append("search", search)
      if (statusFilter) params.append("status", statusFilter)

      const res = await fetch(`/api/subscriptions?${params}`)
      const data = await res.json()

      setSubscriptions(data.subscriptions || [])
      setStats(data.stats || stats)
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0,
      }))
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.perPage, search, statusFilter])

  useEffect(() => {
    fetchSubscriptions()
  }, [fetchSubscriptions])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === "all" ? "" : value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleAction = async (sub: Subscription, action: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        if (action === "generateInvoice") {
          const data = await res.json()
          router.push(`/invoices/${data.invoiceId}`)
        } else {
          fetchSubscriptions()
        }
      }
    } catch (error) {
      console.error("Error performing action:", error)
    }
  }

  const handleDelete = async () => {
    if (!selectedSubscription) return

    try {
      const res = await fetch(`/api/subscriptions/${selectedSubscription.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        fetchSubscriptions()
      }
    } catch (error) {
      console.error("Error deleting subscription:", error)
    } finally {
      setDeleteDialogOpen(false)
      setSelectedSubscription(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR")
  }

  const getPageNumbers = () => {
    const pages: number[] = []
    const maxPages = 5
    let start = Math.max(1, pagination.page - Math.floor(maxPages / 2))
    const end = Math.min(pagination.totalPages, start + maxPages - 1)

    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abonnements</h1>
          <p className="text-muted-foreground">Gérez les abonnements et la facturation récurrente</p>
        </div>
        <Link href="/subscriptions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel abonnement
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Play className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actifs</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">MRR</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.mrr)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Calendar className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En pause</p>
              <p className="text-2xl font-bold">{stats.paused}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un abonnement..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="paused">En pause</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium">Numéro</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Client</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Nom</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Cycle</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Montant TTC</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Prochaine facture</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Statut</th>
                <th className="text-right py-3 px-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucun abonnement trouvé
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => {
                  const statusInfo = statusConfig[sub.status] || statusConfig.active
                  return (
                    <tr key={sub.id} className="border-t hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Link
                          href={`/subscriptions/${sub.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {sub.subscriptionNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/clients/${sub.client.id}`}
                          className="hover:underline"
                        >
                          {sub.client.companyName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">{sub.name}</td>
                      <td className="py-3 px-4">{billingCycleLabels[sub.billingCycle] || sub.billingCycle}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(sub.amountTtc)}
                      </td>
                      <td className="py-3 px-4">{formatDate(sub.nextBillingDate)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/subscriptions/${sub.id}`}>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/subscriptions/${sub.id}/edit`}>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            {sub.status === "active" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedSubscription(sub)
                                    setGenerateDialogOpen(true)
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Générer facture
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(sub, "pause")}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Mettre en pause
                                </DropdownMenuItem>
                              </>
                            )}
                            {sub.status === "paused" && (
                              <DropdownMenuItem onClick={() => handleAction(sub, "resume")}>
                                <Play className="h-4 w-4 mr-2" />
                                Reprendre
                              </DropdownMenuItem>
                            )}
                            {(sub.status === "active" || sub.status === "paused") && (
                              <DropdownMenuItem onClick={() => handleAction(sub, "cancel")}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Annuler
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedSubscription(sub)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} sur {pagination.totalPages} ({pagination.total} résultats)
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Précédent
              </Button>
              {getPageNumbers().map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                >
                  {pageNum}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

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

      <AlertDialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Générer une facture</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va créer une nouvelle facture pour cet abonnement et mettre à jour la
              prochaine date de facturation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedSubscription) {
                  handleAction(selectedSubscription, "generateInvoice")
                }
                setGenerateDialogOpen(false)
              }}
            >
              Générer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
