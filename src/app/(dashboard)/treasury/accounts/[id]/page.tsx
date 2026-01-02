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
  Star,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
} from "lucide-react"

interface Transaction {
  id: string
  transactionDate: string
  amount: number
  type: "credit" | "debit"
  label: string | null
  description: string | null
  counterpartyName: string | null
  category: string | null
  isReconciled: boolean
  status: string
  balanceAfter: number | null
}

interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountNumber: string | null
  iban: string | null
  bic: string | null
  accountType: string | null
  currentBalance: number
  availableBalance: number
  currency: string
  status: string
  isPrimary: boolean
  lastSyncAt: string | null
  createdAt: string | null
  transactionCount: number
  stats: {
    monthlyIncome: number
    monthlyExpenses: number
    netCashFlow: number
  }
  transactions: Transaction[]
}

export default function BankAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [account, setAccount] = useState<BankAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchAccount = useCallback(async () => {
    try {
      const res = await fetch(`/api/treasury/accounts/${id}`)
      if (res.ok) {
        const data = await res.json()
        setAccount(data)
      } else {
        router.push("/treasury")
      }
    } catch (error) {
      console.error("Error fetching account:", error)
      router.push("/treasury")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/treasury/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        fetchAccount()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'action")
      }
    } catch (error) {
      console.error("Error performing action:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/treasury/accounts/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/treasury")
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting account:", error)
    } finally {
      setActionLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: account?.currency || "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (!account) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/treasury">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{account.accountName}</h1>
              {account.isPrimary && (
                <Badge variant="secondary">
                  <Star className="h-3 w-3 mr-1" />
                  Principal
                </Badge>
              )}
              <Badge variant={account.status === "active" ? "default" : "secondary"}>
                {account.status === "active" ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{account.bankName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/treasury/transactions/new?accountId=${id}`}>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Transaction
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={actionLoading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/treasury/accounts/${id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </DropdownMenuItem>
              {!account.isPrimary && (
                <DropdownMenuItem onClick={() => handleAction("setPrimary")}>
                  <Star className="h-4 w-4 mr-2" />
                  Définir comme principal
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {account.status === "active" ? (
                <DropdownMenuItem onClick={() => handleAction("deactivate")}>
                  Désactiver
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleAction("activate")}>
                  Activer
                </DropdownMenuItem>
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
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Solde actuel</p>
              <p className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</p>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-sm text-muted-foreground">Entrées du mois</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                +{formatCurrency(account.stats.monthlyIncome)}
              </p>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <p className="text-sm text-muted-foreground">Sorties du mois</p>
              </div>
              <p className="text-2xl font-bold text-red-600">
                -{formatCurrency(account.stats.monthlyExpenses)}
              </p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-card border rounded-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Transactions récentes</h2>
              <Link href={`/treasury?accountId=${id}`}>
                <Button variant="outline" size="sm">
                  Voir tout
                </Button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Date</th>
                    <th className="text-left p-3 text-sm font-medium">Description</th>
                    <th className="text-left p-3 text-sm font-medium">Catégorie</th>
                    <th className="text-right p-3 text-sm font-medium">Montant</th>
                    <th className="text-right p-3 text-sm font-medium">Solde</th>
                    <th className="text-center p-3 text-sm font-medium">Rapproché</th>
                  </tr>
                </thead>
                <tbody>
                  {account.transactions.map((tx) => (
                    <tr key={tx.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 text-sm">{formatDate(tx.transactionDate)}</td>
                      <td className="p-3">
                        <p className="font-medium truncate max-w-xs">
                          {tx.label || tx.description || tx.counterpartyName || "-"}
                        </p>
                      </td>
                      <td className="p-3 text-sm">
                        {tx.category ? (
                          <Badge variant="outline">{tx.category}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className={`p-3 text-right font-medium ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "credit" ? "+" : ""}{formatCurrency(tx.amount)}
                      </td>
                      <td className="p-3 text-right text-sm text-muted-foreground">
                        {tx.balanceAfter ? formatCurrency(tx.balanceAfter) : "-"}
                      </td>
                      <td className="p-3 text-center">
                        {tx.isReconciled ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                  {account.transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Aucune transaction
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Informations</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Banque</p>
                <p className="font-medium">{account.bankName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type de compte</p>
                <p className="font-medium">
                  {account.accountType === "checking" ? "Compte courant" :
                   account.accountType === "savings" ? "Compte épargne" :
                   account.accountType === "business" ? "Compte professionnel" :
                   account.accountType || "-"}
                </p>
              </div>
              {account.accountNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de compte</p>
                  <p className="font-medium font-mono">{account.accountNumber}</p>
                </div>
              )}
              {account.iban && (
                <div>
                  <p className="text-sm text-muted-foreground">IBAN</p>
                  <p className="font-medium font-mono text-sm">
                    {account.iban.replace(/(.{4})/g, "$1 ").trim()}
                  </p>
                </div>
              )}
              {account.bic && (
                <div>
                  <p className="text-sm text-muted-foreground">BIC</p>
                  <p className="font-medium font-mono">{account.bic}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Devise</p>
                <p className="font-medium">{account.currency}</p>
              </div>
              {account.createdAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Créé le</p>
                  <p className="font-medium">{formatDate(account.createdAt)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Statistiques</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transactions</span>
                <span className="font-medium">{account.transactionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Flux net du mois</span>
                <span className={`font-medium ${account.stats.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {account.stats.netCashFlow >= 0 ? "+" : ""}{formatCurrency(account.stats.netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le compte</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce compte bancaire ? Cette action est
              irréversible. Le compte ne peut être supprimé que s&apos;il ne contient aucune
              transaction.
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
    </div>
  )
}
