"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, Building } from "lucide-react"

export default function NewBankAccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [bankName, setBankName] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [iban, setIban] = useState("")
  const [bic, setBic] = useState("")
  const [accountType, setAccountType] = useState("checking")
  const [currentBalance, setCurrentBalance] = useState(0)
  const [currency, setCurrency] = useState("EUR")
  const [isPrimary, setIsPrimary] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bankName || !accountName) {
      alert("Le nom de la banque et du compte sont requis")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/treasury/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName,
          accountName,
          accountNumber,
          iban,
          bic,
          accountType,
          currentBalance,
          currency,
          isPrimary,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/treasury/accounts/${data.id}`)
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la création")
      }
    } catch (error) {
      console.error("Error creating account:", error)
      alert("Erreur lors de la création du compte")
    } finally {
      setLoading(false)
    }
  }

  const formatIban = (value: string) => {
    const cleaned = value.replace(/\s/g, "").toUpperCase()
    return cleaned.replace(/(.{4})/g, "$1 ").trim()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/treasury">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau compte bancaire</h1>
          <p className="text-muted-foreground">Ajoutez un compte pour suivre votre trésorerie</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Building className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Informations du compte</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Nom de la banque *</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: BNP Paribas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Nom du compte *</Label>
              <Input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex: Compte principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountType">Type de compte</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Compte courant</SelectItem>
                  <SelectItem value="savings">Compte épargne</SelectItem>
                  <SelectItem value="business">Compte professionnel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Numéro de compte</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Ex: 00011234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={iban}
                onChange={(e) => setIban(formatIban(e.target.value))}
                placeholder="Ex: FR76 1234 5678 9012 3456 7890 123"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bic">BIC / SWIFT</Label>
              <Input
                id="bic"
                value={bic}
                onChange={(e) => setBic(e.target.value.toUpperCase())}
                placeholder="Ex: BNPAFRPP"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentBalance">Solde initial</Label>
              <Input
                id="currentBalance"
                type="number"
                step="0.01"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="USD">USD - Dollar US</SelectItem>
                  <SelectItem value="GBP">GBP - Livre sterling</SelectItem>
                  <SelectItem value="CHF">CHF - Franc suisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="isPrimary">Compte principal</Label>
              <p className="text-sm text-muted-foreground">
                Définir comme compte par défaut
              </p>
            </div>
            <Switch id="isPrimary" checked={isPrimary} onCheckedChange={setIsPrimary} />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Création..." : "Créer le compte"}
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
