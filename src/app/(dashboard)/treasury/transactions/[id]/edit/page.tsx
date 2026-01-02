"use client"

import { useState, useEffect, useCallback, use } from "react"
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
import { ArrowLeft, Save } from "lucide-react"

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

export default function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const [transactionDate, setTransactionDate] = useState("")
  const [label, setLabel] = useState("")
  const [description, setDescription] = useState("")
  const [counterpartyName, setCounterpartyName] = useState("")
  const [reference, setReference] = useState("")
  const [category, setCategory] = useState("")
  const [subCategory, setSubCategory] = useState("")

  const fetchTransaction = useCallback(async () => {
    try {
      const res = await fetch(`/api/treasury/transactions/${id}`)
      if (res.ok) {
        const data = await res.json()
        setTransactionDate(data.transactionDate.split("T")[0])
        setLabel(data.label || "")
        setDescription(data.description || "")
        setCounterpartyName(data.counterpartyName || "")
        setReference(data.reference || "")
        setCategory(data.category || "")
        setSubCategory(data.subCategory || "")
      } else {
        router.push("/treasury")
      }
    } catch (error) {
      console.error("Error fetching transaction:", error)
      router.push("/treasury")
    } finally {
      setFetching(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchTransaction()
  }, [fetchTransaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)

    try {
      const res = await fetch(`/api/treasury/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          description,
          counterpartyName,
          reference,
          category,
          subCategory,
        }),
      })

      if (res.ok) {
        router.push(`/treasury/transactions/${id}`)
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la modification")
      }
    } catch (error) {
      console.error("Error updating transaction:", error)
      alert("Erreur lors de la modification de la transaction")
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/treasury/transactions/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Modifier la transaction</h1>
          <p className="text-muted-foreground">{label || "Transaction"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informations</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="label">Libellé</Label>
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
                  <SelectItem value="">Aucune</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="counterpartyName">Contrepartie</Label>
              <Input
                id="counterpartyName"
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="Ex: SARL Dupont"
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
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Link href={`/treasury/transactions/${id}`}>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
