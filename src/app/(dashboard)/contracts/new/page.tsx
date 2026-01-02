"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Save, Upload, Plus, Trash2, Users,
  FileText, AlertCircle, GripVertical, UserPlus
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface Client {
  id: string
  companyName: string
  email: string | null
  contactFirstname: string | null
  contactLastname: string | null
}

interface Signer {
  id?: string
  name: string
  email: string
  phone?: string
  signerType: "signer" | "validator" | "viewer"
  language: string
  accessCode?: string
}

export default function NewContractPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [clientId, setClientId] = useState<string>("")
  const [expirationDays, setExpirationDays] = useState(30)
  const [lockOrder, setLockOrder] = useState(false)
  const [signerReminders, setSignerReminders] = useState(true)

  // Signers
  const [signers, setSigners] = useState<Signer[]>([])
  const [signerDialogOpen, setSignerDialogOpen] = useState(false)
  const [editingSigner, setEditingSigner] = useState<Signer | null>(null)
  const [signerForm, setSignerForm] = useState<Signer>({
    name: "",
    email: "",
    phone: "",
    signerType: "signer",
    language: "fr",
    accessCode: "",
  })

  // Documents
  const [documents, setDocuments] = useState<File[]>([])

  // Tenant signer info for "Add myself"
  const [tenantSignerInfo, setTenantSignerInfo] = useState<{
    name: string
    email: string
    phone: string
    companyName: string
  } | null>(null)

  // Fetch clients and tenant info
  useEffect(() => {
    fetch("/api/clients?perPage=100&status=active")
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients || [])
        setLoadingClients(false)
      })
      .catch(() => setLoadingClients(false))

    // Fetch tenant info for "Add myself as signer"
    fetch("/api/tenant/signer-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.signerInfo) {
          setTenantSignerInfo(data.signerInfo)
        }
      })
      .catch(console.error)
  }, [])

  // Auto-fill signer from client
  useEffect(() => {
    if (clientId && signers.length === 0) {
      const client = clients.find((c) => c.id === clientId)
      if (client) {
        const name = [client.contactFirstname, client.contactLastname].filter(Boolean).join(" ") || client.companyName
        if (client.email) {
          setSigners([{
            name,
            email: client.email,
            signerType: "signer",
            language: "fr",
          }])
        }
      }
    }
  }, [clientId, clients])

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const pdfFiles = Array.from(files).filter((f) => f.type === "application/pdf")
      if (documents.length + pdfFiles.length > 5) {
        alert("Maximum 5 documents par contrat")
        return
      }
      setDocuments([...documents, ...pdfFiles])
    }
    e.target.value = ""
  }

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }

  const openSignerDialog = (signer?: Signer, index?: number) => {
    if (signer) {
      setEditingSigner({ ...signer, id: index?.toString() })
      setSignerForm(signer)
    } else {
      setEditingSigner(null)
      setSignerForm({
        name: "",
        email: "",
        phone: "",
        signerType: "signer",
        language: "fr",
        accessCode: "",
      })
    }
    setSignerDialogOpen(true)
  }

  const handleSaveSigner = () => {
    if (!signerForm.name || !signerForm.email) return

    if (editingSigner?.id !== undefined) {
      const newSigners = [...signers]
      newSigners[parseInt(editingSigner.id)] = signerForm
      setSigners(newSigners)
    } else {
      setSigners([...signers, signerForm])
    }
    setSignerDialogOpen(false)
  }

  const handleRemoveSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index))
  }

  const handleAddMyselfAsSigner = () => {
    if (!tenantSignerInfo || !tenantSignerInfo.email) {
      alert("Vos informations de contact ne sont pas configurées. Allez dans Paramètres.")
      return
    }

    // Check if already added
    const alreadyAdded = signers.some(
      (s) => s.email.toLowerCase() === tenantSignerInfo.email.toLowerCase()
    )
    if (alreadyAdded) {
      alert("Vous êtes déjà dans la liste des signataires")
      return
    }

    setSigners([
      ...signers,
      {
        name: tenantSignerInfo.name,
        email: tenantSignerInfo.email,
        phone: tenantSignerInfo.phone,
        signerType: "signer",
        language: "fr",
      },
    ])
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Le titre est requis")
      return
    }
    if (documents.length === 0) {
      alert("Ajoutez au moins un document")
      return
    }
    if (signers.filter((s) => s.signerType === "signer").length === 0) {
      alert("Ajoutez au moins un signataire")
      return
    }

    setLoading(true)

    try {
      // 1. Create contract
      const contractRes = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          clientId: clientId || null,
          expirationDays,
          lockOrder,
          signerReminders,
        }),
      })

      if (!contractRes.ok) {
        const error = await contractRes.json()
        throw new Error(error.error || "Erreur lors de la création")
      }

      const contractData = await contractRes.json()
      const contractId = contractData.contract?.id || contractData.id

      // 2. Upload documents
      for (const doc of documents) {
        const formData = new FormData()
        formData.append("file", doc)

        const docRes = await fetch(`/api/contracts/${contractId}/documents`, {
          method: "POST",
          body: formData,
        })

        if (!docRes.ok) {
          const error = await docRes.json()
          throw new Error(error.error || "Erreur lors de l'upload")
        }
      }

      // 3. Add signers
      for (const signer of signers) {
        const signerRes = await fetch(`/api/contracts/${contractId}/signers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(signer),
        })

        if (!signerRes.ok) {
          const error = await signerRes.json()
          throw new Error(error.error || "Erreur lors de l'ajout du signataire")
        }
      }

      // Redirect to edit page to place fields
      router.push(`/contracts/${contractId}/edit`)
    } catch (error) {
      console.error("Error creating contract:", error)
      alert(error instanceof Error ? error.message : "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  const signerTypeLabels = {
    signer: "Signataire",
    validator: "Validateur",
    viewer: "Observateur",
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <button className="p-2 rounded-xl transition-colors hover:bg-[#F5F5F7]">
            <ArrowLeft className="w-5 h-5" style={{ color: "#666666" }} />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
            Nouveau contrat
          </h1>
          <p className="text-sm mt-1" style={{ color: "#666666" }}>
            Créez un contrat et ajoutez les documents à faire signer
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "#111111" }}>
            Informations générales
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre du contrat *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Contrat de prestation - Client XYZ"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description optionnelle..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Client (optionnel)</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClients ? (
                      <SelectItem value="_loading" disabled>Chargement...</SelectItem>
                    ) : (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.companyName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expiration">Expiration (jours)</Label>
                <Input
                  id="expiration"
                  type="number"
                  min={1}
                  max={365}
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 30)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockOrder}
                  onChange={(e) => setLockOrder(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm" style={{ color: "#444444" }}>
                  Ordre de signature obligatoire
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signerReminders}
                  onChange={(e) => setSignerReminders(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm" style={{ color: "#444444" }}>
                  Rappels automatiques
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
              Documents ({documents.length}/5)
            </h2>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleAddDocument}
                className="hidden"
              />
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "#E3F2FD", color: "#0064FA" }}
              >
                <Upload className="w-4 h-4" />
                Ajouter PDF
              </span>
            </label>
          </div>

          {documents.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center"
              style={{ borderColor: "#EEEEEE" }}
            >
              <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: "#CCCCCC" }} />
              <p className="text-sm" style={{ color: "#666666" }}>
                Glissez vos fichiers PDF ici ou cliquez sur "Ajouter PDF"
              </p>
              <p className="text-xs mt-1" style={{ color: "#999999" }}>
                Maximum 5 documents PDF
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "#F9F9FB" }}
                >
                  <GripVertical className="w-4 h-4" style={{ color: "#CCCCCC" }} />
                  <FileText className="w-5 h-5" style={{ color: "#0064FA" }} />
                  <span className="flex-1 text-sm truncate" style={{ color: "#444444" }}>
                    {doc.name}
                  </span>
                  <span className="text-xs" style={{ color: "#999999" }}>
                    {(doc.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button
                    onClick={() => handleRemoveDocument(index)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[#FEE2E8]"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: "#F04B69" }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Signers */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "#111111" }}>
              Signataires ({signers.length})
            </h2>
            <div className="flex items-center gap-2">
              {tenantSignerInfo && (
                <button
                  onClick={handleAddMyselfAsSigner}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: "#E8F5E9", color: "#28B95F" }}
                >
                  <UserPlus className="w-4 h-4" />
                  M'ajouter
                </button>
              )}
              <button
                onClick={() => openSignerDialog()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "#E3F2FD", color: "#0064FA" }}
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>
          </div>

          {signers.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center"
              style={{ borderColor: "#EEEEEE" }}
            >
              <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "#CCCCCC" }} />
              <p className="text-sm" style={{ color: "#666666" }}>
                Ajoutez les personnes qui doivent signer ce contrat
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {signers.map((signer, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-[#F5F5F7]"
                  style={{ background: "#F9F9FB" }}
                  onClick={() => openSignerDialog(signer, index)}
                >
                  <GripVertical className="w-4 h-4" style={{ color: "#CCCCCC" }} />
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{
                      background: signer.signerType === "signer" ? "#0064FA"
                        : signer.signerType === "validator" ? "#F0783C" : "#666666"
                    }}
                  >
                    {signer.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#111111" }}>
                      {signer.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "#999999" }}>
                      {signer.email}
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded-full text-[10px] font-semibold"
                    style={{
                      background: signer.signerType === "signer" ? "#E3F2FD"
                        : signer.signerType === "validator" ? "#FFF3E0" : "#F5F5F7",
                      color: signer.signerType === "signer" ? "#0064FA"
                        : signer.signerType === "validator" ? "#F0783C" : "#666666"
                    }}
                  >
                    {signerTypeLabels[signer.signerType]}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveSigner(index)
                    }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[#FEE2E8]"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: "#F04B69" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {signers.filter((s) => s.signerType === "signer").length === 0 && signers.length > 0 && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-xl" style={{ background: "#FEF3CD" }}>
              <AlertCircle className="w-4 h-4" style={{ color: "#DCB40A" }} />
              <p className="text-xs" style={{ color: "#DCB40A" }}>
                Ajoutez au moins un signataire (pas seulement des validateurs/observateurs)
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/contracts">
            <Button variant="outline" className="rounded-xl">
              Annuler
            </Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl"
            style={{ background: "#0064FA" }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Créer et configurer les champs
          </Button>
        </div>
      </div>

      {/* Signer Dialog */}
      <Dialog open={signerDialogOpen} onOpenChange={setSignerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSigner ? "Modifier le signataire" : "Ajouter un signataire"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="signer-name">Nom complet *</Label>
              <Input
                id="signer-name"
                value={signerForm.name}
                onChange={(e) => setSignerForm({ ...signerForm, name: e.target.value })}
                placeholder="Jean Dupont"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="signer-email">Email *</Label>
              <Input
                id="signer-email"
                type="email"
                value={signerForm.email}
                onChange={(e) => setSignerForm({ ...signerForm, email: e.target.value })}
                placeholder="jean@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="signer-phone">Téléphone</Label>
              <Input
                id="signer-phone"
                type="tel"
                value={signerForm.phone}
                onChange={(e) => setSignerForm({ ...signerForm, phone: e.target.value })}
                placeholder="+33 6 12 34 56 78"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signer-type">Rôle</Label>
                <Select
                  value={signerForm.signerType}
                  onValueChange={(v: "signer" | "validator" | "viewer") => setSignerForm({ ...signerForm, signerType: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signer">Signataire</SelectItem>
                    <SelectItem value="validator">Validateur</SelectItem>
                    <SelectItem value="viewer">Observateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="signer-language">Langue</Label>
                <Select
                  value={signerForm.language}
                  onValueChange={(v) => setSignerForm({ ...signerForm, language: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="signer-code">Code d'accès (optionnel)</Label>
              <Input
                id="signer-code"
                value={signerForm.accessCode}
                onChange={(e) => setSignerForm({ ...signerForm, accessCode: e.target.value })}
                placeholder="Code de sécurité"
                className="mt-1"
              />
              <p className="text-xs mt-1" style={{ color: "#999999" }}>
                Le signataire devra entrer ce code pour accéder au document
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignerDialogOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={handleSaveSigner}
              disabled={!signerForm.name || !signerForm.email}
              className="rounded-xl"
              style={{ background: "#0064FA" }}
            >
              {editingSigner ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
