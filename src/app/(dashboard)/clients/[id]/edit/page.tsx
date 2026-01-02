"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Building2, User, Loader2 } from "lucide-react"

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientType, setClientType] = useState<"company" | "individual">("company")

  const [formData, setFormData] = useState({
    companyName: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    siret: "",
    siren: "",
    vatNumber: "",
    apeCode: "",
    legalForm: "",
    capital: "",
    address: "",
    postalCode: "",
    city: "",
    country: "France",
    website: "",
    contactFirstname: "",
    contactLastname: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    status: "prospect",
  })

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${params.id}`)
        if (!res.ok) throw new Error("Not found")
        const data = await res.json()
        const client = data.client

        setClientType(client.client_type || "company")
        setFormData({
          companyName: client.companyName || "",
          first_name: client.first_name || "",
          last_name: client.last_name || "",
          email: client.email || "",
          phone: client.phone || "",
          siret: client.siret || "",
          siren: client.siren || "",
          vatNumber: client.vatNumber || "",
          apeCode: client.apeCode || "",
          legalForm: client.legalForm || "",
          capital: client.capital?.toString() || "",
          address: client.address || "",
          postalCode: client.postalCode || "",
          city: client.city || "",
          country: client.country || "France",
          website: client.website || "",
          contactFirstname: client.contactFirstname || "",
          contactLastname: client.contactLastname || "",
          contactEmail: client.contactEmail || "",
          contactPhone: client.contactPhone || "",
          notes: client.notes || "",
          status: client.status || "prospect",
        })
      } catch (error) {
        console.error(error)
        router.push("/clients")
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [params.id, router])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          client_type: clientType,
        }),
      })

      if (res.ok) {
        router.push(`/clients/${params.id}`)
      }
    } catch (error) {
      console.error("Failed to update client:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/clients/${params.id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modifier le client</h1>
          <p className="text-muted-foreground">{formData.companyName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Type */}
            <Card>
              <CardHeader>
                <CardTitle>Type de client</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={clientType} onValueChange={(v) => setClientType(v as "company" | "individual")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="company" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Entreprise
                    </TabsTrigger>
                    <TabsTrigger value="individual" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Particulier
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations generales</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                {clientType === "company" ? (
                  <>
                    <div className="md:col-span-2">
                      <Label htmlFor="companyName">Raison sociale *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="siret">SIRET</Label>
                      <Input
                        id="siret"
                        value={formData.siret}
                        onChange={(e) => handleChange("siret", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="siren">SIREN</Label>
                      <Input
                        id="siren"
                        value={formData.siren}
                        onChange={(e) => handleChange("siren", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="vatNumber">N° TVA</Label>
                      <Input
                        id="vatNumber"
                        value={formData.vatNumber}
                        onChange={(e) => handleChange("vatNumber", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="apeCode">Code APE</Label>
                      <Input
                        id="apeCode"
                        value={formData.apeCode}
                        onChange={(e) => handleChange("apeCode", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="legalForm">Forme juridique</Label>
                      <Input
                        id="legalForm"
                        value={formData.legalForm}
                        onChange={(e) => handleChange("legalForm", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="capital">Capital</Label>
                      <Input
                        id="capital"
                        type="number"
                        value={formData.capital}
                        onChange={(e) => handleChange("capital", e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="first_name">Prenom</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => handleChange("first_name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Nom</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleChange("last_name", e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="companyName">Nom complet *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => handleChange("companyName", e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Coordonnees</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telephone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                  />
                </div>
                <div></div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Person */}
            {clientType === "company" && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact principal</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="contactFirstname">Prenom</Label>
                    <Input
                      id="contactFirstname"
                      value={formData.contactFirstname}
                      onChange={(e) => handleChange("contactFirstname", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactLastname">Nom</Label>
                    <Input
                      id="contactLastname"
                      value={formData.contactLastname}
                      onChange={(e) => handleChange("contactLastname", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleChange("contactEmail", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPhone">Telephone</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone}
                      onChange={(e) => handleChange("contactPhone", e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Notes internes sur ce client..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statut</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full gradient-primary text-white" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      "Enregistrer les modifications"
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push(`/clients/${params.id}`)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
