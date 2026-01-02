"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
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
import { ArrowLeft, Save, Search, Loader2 } from "lucide-react"

interface Client {
  id: string
  companyName: string
  email: string
}

function NewTicketForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get("clientId") || ""

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [searchClient, setSearchClient] = useState("")

  const [clientId, setClientId] = useState(preselectedClientId)
  const [subject, setSubject] = useState("")
  const [senderEmail, setSenderEmail] = useState("")
  const [senderName, setSenderName] = useState("")
  const [priority, setPriority] = useState("normal")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchClient) params.append("search", searchClient)
      params.append("limit", "20")

      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(data.clients || [])

      // If preselected client, set email
      if (preselectedClientId) {
        const client = (data.clients || []).find(
          (c: Client) => c.id === preselectedClientId
        )
        if (client) {
          setSenderEmail(client.email)
          setSenderName(client.companyName)
        }
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }, [searchClient, preselectedClientId])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleClientChange = (value: string) => {
    setClientId(value === "none" ? "" : value)
    const client = clients.find((c) => c.id === value)
    if (client) {
      setSenderEmail(client.email)
      setSenderName(client.companyName)
    } else if (value === "none") {
      // Don't clear email/name when selecting "none"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject) {
      alert("Le sujet est requis")
      return
    }

    if (!senderEmail) {
      alert("L'email est requis")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || null,
          subject,
          senderEmail,
          senderName,
          priority,
          content,
          tags,
        }),
      })

      if (res.ok) {
        const ticket = await res.json()
        router.push(`/tickets/${ticket.id}`)
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la création")
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
      alert("Erreur lors de la création du ticket")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nouveau ticket</h1>
          <p className="text-muted-foreground">Créez un ticket de support</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Contact */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Contact</h2>

          <div className="space-y-2">
            <Label>Client existant</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={searchClient}
                onChange={(e) => setSearchClient(e.target.value)}
                className="pl-10 mb-2"
              />
            </div>
            <Select value={clientId || "none"} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.companyName} - {client.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Email *</Label>
              <Input
                id="senderEmail"
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="contact@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderName">Nom</Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>
          </div>
        </div>

        {/* Ticket */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Ticket</h2>

          <div className="space-y-2">
            <Label htmlFor="subject">Sujet *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Problème avec ma facture"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="facturation, urgent (séparés par virgule)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message initial</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Décrivez le problème ou la demande..."
              rows={6}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Création..." : "Créer le ticket"}
          </Button>
          <Link href="/tickets">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NewTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewTicketForm />
    </Suspense>
  )
}
