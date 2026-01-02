"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Send, Save, FileText, Users, Plus, Trash2,
  PenTool, Type, Calendar, Hash, ChevronDown, AlertCircle, UserPlus, User, Loader2
} from "lucide-react"
import dynamic from "next/dynamic"

// Import PDFViewer dynamically to avoid SSR issues with react-pdf
const PDFViewer = dynamic(
  () => import("@/components/contracts/pdf-viewer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0064FA" }} />
      </div>
    )
  }
)
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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

interface Document {
  id: string
  filename: string
  originalPath: string
  pageCount: number | null
  fields: Field[]
}

interface Signer {
  id: string
  name: string
  email: string
  signerType: "signer" | "validator" | "viewer"
}

interface Field {
  id: string
  documentId: string
  signerId: string | null
  signerName: string | null
  fieldType: string
  pages: string
  position: string
  size: string
}

interface Contract {
  id: string
  title: string
  status: string
  documents: Document[]
  signers: Signer[]
}

const fieldTypes = [
  { value: "signature", label: "Signature", icon: PenTool, color: "#0064FA" },
  { value: "initials", label: "Initiales", icon: PenTool, color: "#5F00BA" },
  { value: "name", label: "Nom", icon: Type, color: "#28B95F" },
  { value: "date", label: "Date", icon: Calendar, color: "#F0783C" },
  { value: "text", label: "Texte fixe", icon: Type, color: "#666666" },
  { value: "input", label: "Champ texte", icon: Hash, color: "#DCB40A" },
]

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  // Field dialog
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<string>("")
  const [fieldForm, setFieldForm] = useState({
    signerId: "",
    fieldType: "signature",
    pages: "1",
    positionX: "50",
    positionY: "50",
    width: "200",
    height: "50",
    content: "",
  })

  // Selected document for viewing
  const [activeDocIndex, setActiveDocIndex] = useState(0)

  // For drag-and-drop field placement
  const [selectedSignerForField, setSelectedSignerForField] = useState<string | null>(null)
  const [selectedFieldTypeForDrop, setSelectedFieldTypeForDrop] = useState<string>("signature")

  // Auto-select first signer when contract loads
  useEffect(() => {
    if (contract && contract.signers.length > 0 && !selectedSignerForField) {
      const firstSigner = contract.signers.find(s => s.signerType === "signer")
      if (firstSigner) {
        setSelectedSignerForField(firstSigner.id)
      }
    }
  }, [contract, selectedSignerForField])

  // Tenant signer info for "Add myself"
  const [tenantSignerInfo, setTenantSignerInfo] = useState<{
    name: string
    email: string
    phone: string
  } | null>(null)

  // Fetch contract
  useEffect(() => {
    fetchContract()

    // Fetch tenant info for "Add myself as signer"
    fetch("/api/tenant/signer-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.signerInfo) {
          setTenantSignerInfo(data.signerInfo)
        }
      })
      .catch(console.error)
  }, [id])

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`)
      const data = await res.json()
      if (data.contract) {
        setContract(data.contract)
        if (data.contract.documents.length > 0) {
          setSelectedDocument(data.contract.documents[0].id)
        }
      }
    } catch (error) {
      console.error("Error fetching contract:", error)
    } finally {
      setLoading(false)
    }
  }

  const openFieldDialog = (field?: Field, documentId?: string) => {
    if (field) {
      setEditingField(field)
      const position = JSON.parse(field.position)
      const size = JSON.parse(field.size)
      setFieldForm({
        signerId: field.signerId || "",
        fieldType: field.fieldType,
        pages: field.pages,
        positionX: position.x.toString(),
        positionY: position.y.toString(),
        width: size.width.toString(),
        height: size.height.toString(),
        content: "",
      })
      setSelectedDocument(field.documentId)
    } else {
      setEditingField(null)
      setFieldForm({
        signerId: contract?.signers[0]?.id || "",
        fieldType: "signature",
        pages: "1",
        positionX: "50",
        positionY: "700",
        width: "200",
        height: "50",
        content: "",
      })
      if (documentId) {
        setSelectedDocument(documentId)
      }
    }
    setFieldDialogOpen(true)
  }

  const handleSaveField = async () => {
    if (!selectedDocument) return

    setSaving(true)
    try {
      const position = JSON.stringify({
        x: parseInt(fieldForm.positionX),
        y: parseInt(fieldForm.positionY),
      })
      const size = JSON.stringify({
        width: parseInt(fieldForm.width),
        height: parseInt(fieldForm.height),
      })

      if (editingField) {
        // Update field
        await fetch(`/api/contracts/${id}/fields`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldId: editingField.id,
            signerId: fieldForm.signerId || null,
            fieldType: fieldForm.fieldType,
            pages: fieldForm.pages,
            position,
            size,
            content: fieldForm.content || null,
          }),
        })
      } else {
        // Create field
        await fetch(`/api/contracts/${id}/fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: selectedDocument,
            signerId: fieldForm.signerId || null,
            fieldType: fieldForm.fieldType,
            pages: fieldForm.pages,
            position,
            size,
            content: fieldForm.content || null,
          }),
        })
      }

      setFieldDialogOpen(false)
      fetchContract()
    } catch (error) {
      console.error("Error saving field:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    try {
      await fetch(`/api/contracts/${id}/fields?fieldId=${fieldId}`, {
        method: "DELETE",
      })
      fetchContract()
    } catch (error) {
      console.error("Error deleting field:", error)
    }
  }

  // Create field via drag-and-drop on PDF
  const handleFieldCreate = async (fieldData: {
    signerId: string
    fieldType: string
    page: number
    position: { x: number; y: number }
    size: { width: number; height: number }
  }) => {
    if (!activeDocument) return

    try {
      await fetch(`/api/contracts/${id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: activeDocument.id,
          signerId: fieldData.signerId,
          fieldType: fieldData.fieldType,
          pages: fieldData.page.toString(),
          position: JSON.stringify({ x: Math.round(fieldData.position.x), y: Math.round(fieldData.position.y) }),
          size: JSON.stringify({ width: Math.round(fieldData.size.width), height: Math.round(fieldData.size.height) }),
        }),
      })
      fetchContract()
    } catch (error) {
      console.error("Error creating field:", error)
    }
  }

  // Move field via drag on PDF
  const handleFieldMove = async (fieldId: string, position: { x: number; y: number }) => {
    // Optimistic update in local state
    setContract((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        documents: prev.documents.map((doc) => ({
          ...doc,
          fields: doc.fields.map((field) =>
            field.id === fieldId
              ? { ...field, position: JSON.stringify({ x: Math.round(position.x), y: Math.round(position.y) }) }
              : field
          ),
        })),
      }
    })
  }

  // Resize field via drag on PDF
  const handleFieldResize = (fieldId: string, position: { x: number; y: number }, size: { width: number; height: number }) => {
    // Optimistic update in local state
    setContract((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        documents: prev.documents.map((doc) => ({
          ...doc,
          fields: doc.fields.map((field) =>
            field.id === fieldId
              ? {
                  ...field,
                  position: JSON.stringify({ x: Math.round(position.x), y: Math.round(position.y) }),
                  size: JSON.stringify({ width: Math.round(size.width), height: Math.round(size.height) }),
                }
              : field
          ),
        })),
      }
    })
  }

  // Save field position/size after drag/resize ends
  const saveFieldPosition = async (fieldId: string, position: { x: number; y: number }, size?: { width: number; height: number }) => {
    try {
      const field = contract?.documents.flatMap((d) => d.fields).find((f) => f.id === fieldId)
      if (!field) return

      const updateData: Record<string, unknown> = {
        fieldId,
        position: JSON.stringify({ x: Math.round(position.x), y: Math.round(position.y) }),
      }

      if (size) {
        updateData.size = JSON.stringify({ width: Math.round(size.width), height: Math.round(size.height) })
      }

      await fetch(`/api/contracts/${id}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })
    } catch (error) {
      console.error("Error saving field:", error)
    }
  }

  const handleAddMyselfAsSigner = async () => {
    if (!tenantSignerInfo || !tenantSignerInfo.email) {
      alert("Vos informations de contact ne sont pas configurées. Allez dans Paramètres.")
      return
    }

    // Check if already added
    const alreadyAdded = contract?.signers.some(
      (s) => s.email.toLowerCase() === tenantSignerInfo.email.toLowerCase()
    )
    if (alreadyAdded) {
      alert("Vous êtes déjà dans la liste des signataires")
      return
    }

    try {
      const res = await fetch(`/api/contracts/${id}/signers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tenantSignerInfo.name,
          email: tenantSignerInfo.email,
          phone: tenantSignerInfo.phone,
          signerType: "signer",
          language: "fr",
        }),
      })

      if (res.ok) {
        fetchContract()
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'ajout")
      }
    } catch (error) {
      console.error("Error adding myself as signer:", error)
    }
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/contracts/${id}/send`, {
        method: "POST",
      })

      if (res.ok) {
        router.push(`/contracts/${id}`)
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'envoi")
      }
    } catch (error) {
      console.error("Error sending contract:", error)
    } finally {
      setSending(false)
      setSendDialogOpen(false)
    }
  }

  // Check if all signers have at least one signature field
  const getSignersWithoutFields = () => {
    if (!contract) return []
    return contract.signers
      .filter((s) => s.signerType === "signer")
      .filter((s) => {
        const hasField = contract.documents.some((d) =>
          d.fields.some((f) => f.signerId === s.id && f.fieldType === "signature")
        )
        return !hasField
      })
  }

  const signersWithoutFields = getSignersWithoutFields()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0064FA", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "#666666" }}>Contrat non trouvé</p>
        <Link href="/contracts">
          <Button className="mt-4">Retour aux contrats</Button>
        </Link>
      </div>
    )
  }

  if (contract.status !== "draft") {
    router.push(`/contracts/${id}`)
    return null
  }

  const activeDocument = contract.documents[activeDocIndex]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/contracts">
          <button className="p-2 rounded-xl transition-colors hover:bg-[#F5F5F7]">
            <ArrowLeft className="w-5 h-5" style={{ color: "#666666" }} />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold" style={{ color: "#111111" }}>
            {contract.title}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#666666" }}>
            Placez les champs de signature sur les documents
          </p>
        </div>
        <Button
          onClick={() => setSendDialogOpen(true)}
          disabled={signersWithoutFields.length > 0}
          className="rounded-xl"
          style={{ background: "#28B95F" }}
        >
          <Send className="w-4 h-4 mr-2" />
          Envoyer pour signature
        </Button>
      </div>

      {/* Warning if signers without fields */}
      {signersWithoutFields.length > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: "#FEF3CD" }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#DCB40A" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#DCB40A" }}>
              Champs manquants
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#B8A000" }}>
              Les signataires suivants n'ont pas de champ signature : {signersWithoutFields.map((s) => s.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Document tabs + preview */}
        <div className="lg:col-span-2">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Document tabs */}
            <div className="flex border-b" style={{ borderColor: "#EEEEEE" }}>
              {contract.documents.map((doc, index) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDocIndex(index)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2"
                  style={{
                    borderColor: activeDocIndex === index ? "#0064FA" : "transparent",
                    color: activeDocIndex === index ? "#0064FA" : "#666666",
                  }}
                >
                  <FileText className="w-4 h-4" />
                  {doc.filename.length > 20 ? doc.filename.substring(0, 20) + "..." : doc.filename}
                </button>
              ))}
            </div>

            {/* Signer selection for field placement */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#EEEEEE", background: selectedSignerForField ? "#E8F4FF" : "#FEF3CD" }}>
              <span className="text-xs font-semibold" style={{ color: selectedSignerForField ? "#0064FA" : "#B8A000" }}>
                {selectedSignerForField ? "✓ Signataire :" : "⚠ Choisir signataire :"}
              </span>
              <div className="flex gap-1 flex-1">
                {contract.signers.filter(s => s.signerType === "signer").map((signer, idx) => {
                  const colors = ["#0064FA", "#28B95F", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"]
                  const color = colors[idx % colors.length]
                  const isSelected = selectedSignerForField === signer.id
                  return (
                    <button
                      key={signer.id}
                      onClick={() => setSelectedSignerForField(signer.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isSelected ? "ring-2 ring-offset-1 shadow-md scale-105" : "opacity-60 hover:opacity-100 hover:scale-102"
                      }`}
                      style={{
                        background: isSelected ? color : `${color}15`,
                        color: isSelected ? "#FFFFFF" : color,
                        // @ts-expect-error CSS custom property
                        "--tw-ring-color": color,
                      }}
                    >
                      {signer.name.split(" ")[0]}
                    </button>
                  )
                })}
              </div>

              {/* Field type selector */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}>
                {[
                  { value: "signature", icon: PenTool, label: "Signature" },
                  { value: "initials", icon: User, label: "Paraphe" },
                  { value: "date", icon: Calendar, label: "Date" },
                  { value: "name", icon: Type, label: "Nom" },
                ].map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedFieldTypeForDrop(type.value)}
                      className={`p-1.5 rounded-lg transition-all ${
                        selectedFieldTypeForDrop === type.value ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      style={{
                        color: selectedFieldTypeForDrop === type.value ? "#0064FA" : "#666666",
                      }}
                      title={type.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* PDF Viewer with drag-and-drop */}
            <div style={{ height: "calc(100vh - 380px)", minHeight: "500px" }}>
              {activeDocument && (
                <PDFViewer
                  pdfUrl={activeDocument.originalPath}
                  documentId={activeDocument.id}
                  signers={contract.signers}
                  fields={activeDocument.fields}
                  selectedSigner={selectedSignerForField}
                  selectedFieldType={selectedFieldTypeForDrop}
                  onFieldCreate={handleFieldCreate}
                  onFieldMove={handleFieldMove}
                  onFieldResize={handleFieldResize}
                  onFieldSave={saveFieldPosition}
                  onFieldDelete={handleDeleteField}
                  onFieldSelect={(field) => openFieldDialog(field)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: Fields list + signers */}
        <div className="space-y-6">
          {/* Signers */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "#111111" }}>
                <Users className="w-4 h-4 inline mr-2" style={{ color: "#666666" }} />
                Signataires ({contract.signers.length})
              </h3>
              {tenantSignerInfo && (
                <button
                  onClick={handleAddMyselfAsSigner}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors hover:opacity-80"
                  style={{ background: "#E8F5E9", color: "#28B95F" }}
                  title="M'ajouter comme signataire"
                >
                  <UserPlus className="w-3 h-3" />
                  Moi
                </button>
              )}
            </div>
            <div className="space-y-2">
              {contract.signers.map((signer) => {
                const hasSignature = contract.documents.some((d) =>
                  d.fields.some((f) => f.signerId === signer.id && f.fieldType === "signature")
                )
                return (
                  <div
                    key={signer.id}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ background: "#F9F9FB" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                      style={{
                        background: signer.signerType === "signer" ? "#0064FA"
                          : signer.signerType === "validator" ? "#F0783C" : "#666666"
                      }}
                    >
                      {signer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "#111111" }}>
                        {signer.name}
                      </p>
                    </div>
                    {signer.signerType === "signer" && (
                      hasSignature ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#D4EDDA", color: "#28B95F" }}>
                          OK
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#FEE2E8", color: "#F04B69" }}>
                          Manquant
                        </span>
                      )
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Fields for active document */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "#111111" }}>
                Champs ({activeDocument?.fields.length || 0})
              </h3>
            </div>

            {activeDocument?.fields.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs" style={{ color: "#999999" }}>
                  Aucun champ sur ce document
                </p>
                <p className="mt-2 text-xs" style={{ color: "#0064FA" }}>
                  Cliquez sur le PDF pour placer un champ
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeDocument?.fields.map((field) => {
                  const signer = contract.signers.find((s) => s.id === field.signerId)
                  const fieldType = fieldTypes.find((t) => t.value === field.fieldType)
                  const FieldIcon = fieldType?.icon || Type

                  return (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-[#F5F5F7]"
                      style={{ background: "#F9F9FB" }}
                      onClick={() => openFieldDialog(field)}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${fieldType?.color}20` }}
                      >
                        <FieldIcon className="w-3.5 h-3.5" style={{ color: fieldType?.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "#111111" }}>
                          {fieldType?.label || field.fieldType}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: "#999999" }}>
                          {signer?.name || "Non assigné"} • Page {field.pages}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteField(field.id)
                        }}
                        className="p-1 rounded transition-colors hover:bg-[#FEE2E8]"
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "#F04B69" }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#E3F2FD", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#0064FA" }}>
              Comment placer les champs
            </h3>
            <ol className="text-xs space-y-1.5" style={{ color: "#1565C0" }}>
              <li>1. Sélectionnez un <strong>signataire</strong> (barre bleue)</li>
              <li>2. Choisissez le <strong>type de champ</strong></li>
              <li>3. <strong>Cliquez sur le PDF</strong> pour placer</li>
              <li>4. <strong>Glissez</strong> pour repositionner</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Field Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "Modifier le champ" : "Ajouter un champ"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Document</Label>
              <Select
                value={selectedDocument}
                onValueChange={setSelectedDocument}
                disabled={!!editingField}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contract.documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type de champ</Label>
                <Select
                  value={fieldForm.fieldType}
                  onValueChange={(v) => setFieldForm({ ...fieldForm, fieldType: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assigné à</Label>
                <Select
                  value={fieldForm.signerId}
                  onValueChange={(v) => setFieldForm({ ...fieldForm, signerId: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {contract.signers.map((signer) => (
                      <SelectItem key={signer.id} value={signer.id}>
                        {signer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Page(s)</Label>
              <Input
                value={fieldForm.pages}
                onChange={(e) => setFieldForm({ ...fieldForm, pages: e.target.value })}
                placeholder="1 ou 1,2,3 ou 1-3"
                className="mt-1"
              />
              <p className="text-[10px] mt-1" style={{ color: "#999999" }}>
                Numéro de page, liste (1,2,3) ou plage (1-3)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position X (pt)</Label>
                <Input
                  type="number"
                  value={fieldForm.positionX}
                  onChange={(e) => setFieldForm({ ...fieldForm, positionX: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Position Y (pt)</Label>
                <Input
                  type="number"
                  value={fieldForm.positionY}
                  onChange={(e) => setFieldForm({ ...fieldForm, positionY: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Largeur (pt)</Label>
                <Input
                  type="number"
                  value={fieldForm.width}
                  onChange={(e) => setFieldForm({ ...fieldForm, width: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Hauteur (pt)</Label>
                <Input
                  type="number"
                  value={fieldForm.height}
                  onChange={(e) => setFieldForm({ ...fieldForm, height: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            {fieldForm.fieldType === "text" && (
              <div>
                <Label>Contenu du texte</Label>
                <Input
                  value={fieldForm.content}
                  onChange={(e) => setFieldForm({ ...fieldForm, content: e.target.value })}
                  placeholder="Texte à afficher"
                  className="mt-1"
                />
              </div>
            )}
            <p className="text-xs p-3 rounded-lg" style={{ background: "#E3F2FD", color: "#0064FA" }}>
              <strong>Astuce :</strong> Un document PDF A4 fait environ 595 x 842 points.
              Position (0,0) = coin inférieur gauche.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={handleSaveField}
              disabled={saving || !fieldForm.signerId}
              className="rounded-xl"
              style={{ background: "#0064FA" }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingField ? "Modifier" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <AlertDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer pour signature ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le contrat sera envoyé à {contract.signers.length} destinataire(s).
              Vous ne pourrez plus modifier le contrat après l'envoi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={sending}
              className="rounded-xl"
              style={{ background: "#28B95F" }}
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
