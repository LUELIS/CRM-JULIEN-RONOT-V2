"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Save, Search } from "lucide-react"

interface Client {
  id: string
  companyName: string
  email: string
}

export default function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [searchClient, setSearchClient] = useState("")

  const [clientId, setClientId] = useState("")
  const [subject, setSubject] = useState("")
  const [senderEmail, setSenderEmail] = useState("")
  const [senderName, setSenderName] = useState("")
  const [priority, setPriority] = useState("normal")
  const [tags, setTags] = useState("")
  const [ticketNumber, setTicketNumber] = useState("")

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`)
      if (res.ok) {
        const data = await res.json()
        setTicketNumber(data.ticketNumber)
        setClientId(data.clientId || "")
        setSubject(data.subject)
        setSenderEmail(data.senderEmail)
        setSenderName(data.senderName || "")
        setPriority(data.priority)
        setTags(data.tags || "")
      } else {
        router.push("/tickets")
      }
    } catch (error) {
      console.error("Error fetching ticket:", error)
      router.push("/tickets")
    } finally {
      setFetching(false)
    }
  }, [id, router])

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchClient) params.append("search", searchClient)
      params.append("limit", "20")

      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }, [searchClient])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const handleClientChange = (value: string) => {
    setClientId(value === "none" ? "" : value)
    const client = clients.find((c) => c.id === value)
    if (client) {
      setSenderEmail(client.email)
      setSenderName(client.companyName)
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
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || null,
          subject,
          senderEmail,
          senderName,
          priority,
          tags,
        }),
      })

      if (res.ok) {
        router.push(`/tickets/${id}`)
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de la modification")
      }
    } catch (error) {
      console.error("Error updating ticket:", error)
      alert("Erreur lors de la modification du ticket")
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
        <Link href={`/tickets/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Modifier le ticket</h1>
          <p className="text-muted-foreground">{ticketNumber}</p>
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
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Link href={`/tickets/${id}`}>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
