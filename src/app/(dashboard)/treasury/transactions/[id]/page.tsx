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
  CheckCircle2,
  XCircle,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  Calendar,
  Tag,
} from "lucide-react"

interface Transaction {
  id: string
  bankAccountId: string
  transactionId: string | null
  externalId: string | null
  transactionDate: string
  valueDate: string | null
  amount: number
  currency: string
  type: "credit" | "debit"
  label: string | null
  description: string | null
  counterpartyName: string | null
  counterpartyAccount: string | null
  reference: string | null
  category: string | null
  subCategory: string | null
  tags: string[]
  isReconciled: boolean
  status: string
  balanceAfter: number | null
  isInternalTransfer: boolean
  createdAt: string | null
  bankAccount: {
    id: string
    accountName: string
    bankName: string
    iban: string | null
  }
  linkedInvoice: {
    id: string
    invoiceNumber: string
    status: string
    totalTtc: number
  } | null
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const fetchTransaction = useCallback(async () => {
    try {
      const res = await fetch(`/api/treasury/transactions/${id}`)
      if (res.ok) {
        const data = await res.json()
        setTransaction(data)
      } else {
        router.push("/treasury")
      }
    } catch (error) {
      console.error("Error fetching transaction:", error)
      router.push("/treasury")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchTransaction()
  }, [fetchTransaction])

  const handleAction = async (action: string, payload?: object) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/treasury/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      })

      if (res.ok) {
        fetchTransaction()
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
      const res = await fetch(`/api/treasury/transactions/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/treasury")
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error("Error deleting transaction:", error)
    } finally {
      setActionLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: transaction?.currency || "EUR",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
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

  if (!transaction) {
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
              <div className={`p-2 rounded-full ${transaction.type === "credit" ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}>
                {transaction.type === "credit" ? (
                  <ArrowUpRight className={`h-5 w-5 ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`} />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {transaction.label || transaction.counterpartyName || "Transaction"}
                </h1>
                <p className="text-muted-foreground">
                  {formatDate(transaction.transactionDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleAction(transaction.isReconciled ? "unreconcile" : "reconcile")}
            disabled={actionLoading}
          >
            <CheckCircle2 className={`h-4 w-4 mr-2 ${transaction.isReconciled ? "text-green-600" : ""}`} />
            {transaction.isReconciled ? "Rapprochée" : "Rapprocher"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={actionLoading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/treasury/transactions/${id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Link>
              </DropdownMenuItem>
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
          {/* Montant */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Montant</p>
                <p className={`text-4xl font-bold ${transaction.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                  {transaction.type === "credit" ? "+" : ""}{formatCurrency(transaction.amount)}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={transaction.isReconciled ? "default" : "secondary"}>
                  {transaction.isReconciled ? "Rapprochée" : "Non rapprochée"}
                </Badge>
                {transaction.balanceAfter !== null && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Solde après: {formatCurrency(transaction.balanceAfter)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Détails */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Détails</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date de transaction</p>
                <p className="font-medium">{formatDate(transaction.transactionDate)}</p>
              </div>
              {transaction.valueDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Date de valeur</p>
                  <p className="font-medium">{formatDate(transaction.valueDate)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{transaction.type === "credit" ? "Entrée" : "Sortie"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant="outline">{transaction.status}</Badge>
              </div>
            </div>

            {transaction.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{transaction.description}</p>
              </div>
            )}

            {transaction.reference && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Référence</p>
                <p className="font-mono mt-1">{transaction.reference}</p>
              </div>
            )}
          </div>

          {/* Contrepartie */}
          {(transaction.counterpartyName || transaction.counterpartyAccount) && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Contrepartie</h2>

              <div className="grid grid-cols-2 gap-4">
                {transaction.counterpartyName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nom</p>
                    <p className="font-medium">{transaction.counterpartyName}</p>
                  </div>
                )}
                {transaction.counterpartyAccount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Compte</p>
                    <p className="font-mono">{transaction.counterpartyAccount}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Facture liée */}
          {transaction.linkedInvoice && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Facture liée
              </h2>

              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/invoices/${transaction.linkedInvoice.id}`}
                    className="font-medium hover:underline"
                  >
                    {transaction.linkedInvoice.invoiceNumber}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(transaction.linkedInvoice.totalTtc)}
                  </p>
                </div>
                <Badge variant="outline">{transaction.linkedInvoice.status}</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compte bancaire */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Building className="h-5 w-5" />
              Compte bancaire
            </h2>
            <div className="space-y-2">
              <Link
                href={`/treasury/accounts/${transaction.bankAccount.id}`}
                className="font-medium hover:underline"
              >
                {transaction.bankAccount.accountName}
              </Link>
              <p className="text-sm text-muted-foreground">{transaction.bankAccount.bankName}</p>
              {transaction.bankAccount.iban && (
                <p className="text-xs font-mono text-muted-foreground">
                  {transaction.bankAccount.iban.replace(/(.{4})/g, "$1 ").trim()}
                </p>
              )}
            </div>
          </div>

          {/* Catégorisation */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5" />
              Catégorisation
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Catégorie</p>
                <p className="font-medium">{transaction.category || "-"}</p>
              </div>
              {transaction.subCategory && (
                <div>
                  <p className="text-sm text-muted-foreground">Sous-catégorie</p>
                  <p className="font-medium">{transaction.subCategory}</p>
                </div>
              )}
              {transaction.tags && transaction.tags.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {transaction.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Métadonnées */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5" />
              Métadonnées
            </h2>
            <div className="space-y-3 text-sm">
              {transaction.transactionId && (
                <div>
                  <p className="text-muted-foreground">ID Transaction</p>
                  <p className="font-mono text-xs">{transaction.transactionId}</p>
                </div>
              )}
              {transaction.externalId && (
                <div>
                  <p className="text-muted-foreground">ID Externe</p>
                  <p className="font-mono text-xs">{transaction.externalId}</p>
                </div>
              )}
              {transaction.createdAt && (
                <div>
                  <p className="text-muted-foreground">Créée le</p>
                  <p>{formatDate(transaction.createdAt)}</p>
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
            <AlertDialogTitle>Supprimer la transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette transaction ? Le solde du compte sera
              automatiquement mis à jour. Cette action est irréversible.
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
