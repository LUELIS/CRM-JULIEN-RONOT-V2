"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { ArrowLeft, Save, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface BankAccount {
  id: string
  bankName: string
  accountName: string
  currentBalance: number
}

const CATEGORIES = [
  "Ventes",
  "Services",
  "Salaires",
  "Loyer",
  "Fournitures",
  "Marketing",
  "Assurances",
  "Impôts & Taxes",
  "Frais bancaires",
  "Remboursements",
  "Investissements",
  "Divers",
]

export default function NewTransactionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedAccountId = searchParams.get("accountId") || ""

  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<BankAccount[]>([])

  const [bankAccountId, setBankAccountId] = useState(preselectedAccountId)
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [valueDate, setValueDate] = useState("")
  const [type, setType] = useState<"credit" | "debit">("credit")
  const [amount, setAmount] = useState(0)
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [counterpartyName, setCounterpartyName] = useState("")
  const [counterpartyAccount, setCounterpartyAccount] = useState("")
  const [reference, setReference] = useState("")
  const [category, setCategory] = useState("")
  const [subCategory, setSubCategory] = useState("")

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/treasury/accounts")
      const data = await res.json()
      setAccounts(data.accounts || [])
      if (!preselectedAccountId && data.accounts?.length > 0) {
        const primary = data.accounts.find((a: BankAccount & { isPrimary: boolean }) => a.isPrimary)
        setBankAccountId(primary?.id || data.accounts[0].id)
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    }
  }, [preselectedAccountId])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bankAccountId) {
      alert("Veuillez sélectionner un compte bancaire")
      return
    }

    if (!amount || amount <= 0) {
      alert("Veuillez saisir un montant valide")
      return
    }

    setLoading(true)

    try {
      const finalAmount = type === "debit" ? -Math.abs(amount) : Math.abs(amount)

      const res = await fetch("/api/treasury/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId,
          transactionDate,
          valueDate: valueDate || null,
          amount: finalAmount,
          type,
          label,
          description,
          counterpartyName,
          counterpartyAccount,
          reference,
          category,
          subCategory,
        }),
      })

      if (res.ok) {
        router.push("/treasury")
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la création")
      }
    } catch (error) {
      console.error("Error creating transaction:", error)
      alert("Erreur lors de la création de la transaction")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value)
  }

  const selectedAccount = accounts.find((a) => a.id === bankAccountId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/treasury">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouvelle transaction</h1>
          <p className="text-muted-foreground">Enregistrez une entrée ou sortie</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Type de transaction */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Type de transaction</h2>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType("credit")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                type === "credit"
                  ? "border-green-600 bg-green-50 dark:bg-green-950"
                  : "border-muted hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${type === "credit" ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                  <ArrowUpRight className={`h-5 w-5 ${type === "credit" ? "text-green-600" : "text-muted-foreground"}`} />
                </div>
                <div className="text-left">
                  <p className="font-medium">Entrée</p>
                  <p className="text-sm text-muted-foreground">Crédit, encaissement</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType("debit")}
              className={`p-4 rounded-lg border-2 transition-colors ${
                type === "debit"
                  ? "border-red-600 bg-red-50 dark:bg-red-950"
                  : "border-muted hover:border-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${type === "debit" ? "bg-red-100 dark:bg-red-900" : "bg-muted"}`}>
                  <ArrowDownRight className={`h-5 w-5 ${type === "debit" ? "text-red-600" : "text-muted-foreground"}`} />
                </div>
                <div className="text-left">
                  <p className="font-medium">Sortie</p>
                  <p className="text-sm text-muted-foreground">Débit, paiement</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Informations principales */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informations principales</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankAccountId">Compte bancaire *</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un compte" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountName} - {formatCurrency(account.currentBalance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccount && (
                <p className="text-xs text-muted-foreground">
                  Solde actuel: {formatCurrency(selectedAccount.currentBalance)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className={type === "credit" ? "text-green-600" : "text-red-600"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transactionDate">Date de transaction *</Label>
              <Input
                id="transactionDate"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valueDate">Date de valeur</Label>
              <Input
                id="valueDate"
                type="date"
                value={valueDate}
                onChange={(e) => setValueDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="label">Libellé *</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Paiement client Dupont"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subCategory">Sous-catégorie</Label>
              <Input
                id="subCategory"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="Ex: Maintenance"
              />
            </div>
          </div>
        </div>

        {/* Contrepartie */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Contrepartie</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="counterpartyName">Nom</Label>
              <Input
                id="counterpartyName"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="Ex: SARL Dupont"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="counterpartyAccount">Compte (IBAN)</Label>
              <Input
                id="counterpartyAccount"
                value={counterpartyAccount}
                onChange={(e) => setCounterpartyAccount(e.target.value)}
                placeholder="Ex: FR76..."
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: FAC-2024-00123"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Description</h2>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes ou détails supplémentaires..."
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Création..." : "Créer la transaction"}
          </Button>
          <Link href="/treasury">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
