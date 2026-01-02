"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, FileSignature, Download, Clock, CheckCircle2,
  XCircle, AlertCircle, Send, Eye, User, FileText, Calendar,
  Shield, Loader2
} from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/utils"

interface Signer {
  id: string
  name: string
  email: string
  signerType: string
  status: string
  viewedAt: string | null
  signedAt: string | null
  declinedAt: string | null
  declineReason: string | null
}

interface Document {
  id: string
  filename: string
  pageCount: number
}

interface Contract {
  id: string
  title: string
  description: string | null
  status: string
  expirationDays: number | null
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  expiresAt: string | null
  documents: Document[]
  signers: Signer[]
}

const statusConfig: Record<string, { label: string; bg: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  sent: { label: "En attente", bg: "#E3F2FD", color: "#0064FA", icon: Send },
  viewed: { label: "Consulté", bg: "#FEF3CD", color: "#DCB40A", icon: Eye },
  partially_signed: { label: "En cours de signature", bg: "#FFF3E0", color: "#F0783C", icon: AlertCircle },
  completed: { label: "Signé", bg: "#D4EDDA", color: "#28B95F", icon: CheckCircle2 },
  declined: { label: "Refusé", bg: "#FEE2E8", color: "#F04B69", icon: XCircle },
  expired: { label: "Expiré", bg: "#F5F5F7", color: "#999999", icon: Clock },
  voided: { label: "Annulé", bg: "#F5F5F7", color: "#999999", icon: XCircle },
}

const signerStatusConfig: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "En attente", bg: "#F5F5F7", color: "#666666" },
  sent: { label: "Envoyé", bg: "#E3F2FD", color: "#0064FA" },
  viewed: { label: "Consulté", bg: "#FEF3CD", color: "#DCB40A" },
  signed: { label: "Signé", bg: "#D4EDDA", color: "#28B95F" },
  validated: { label: "Validé", bg: "#D4EDDA", color: "#28B95F" },
  declined: { label: "Refusé", bg: "#FEE2E8", color: "#F04B69" },
}

const signerTypeLabels: Record<string, string> = {
  signer: "Signataire",
  validator: "Validateur",
  viewer: "Observateur",
}

export default function ClientContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      fetchContract()
    }
  }, [params.id])

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/client-portal/contracts/${params.id}`)
      if (!res.ok) {
        router.push("/client-portal/contracts")
        return
      }
      const data = await res.json()
      setContract(data.contract)
    } catch (error) {
      console.error("Error fetching contract:", error)
      router.push("/client-portal/contracts")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (type: "signed" | "audit" | "original") => {
    if (!contract) return
    setDownloading(type)
    try {
      window.open(`/api/client-portal/contracts/${contract.id}/download?type=${type}`, "_blank")
    } finally {
      setTimeout(() => setDownloading(null), 1000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0064FA", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (!contract) {
    return null
  }

  const config = statusConfig[contract.status] || statusConfig.sent
  const StatusIcon = config.icon
  const signersOnly = contract.signers.filter((s) => s.signerType === "signer" || s.signerType === "validator")
  const signedCount = signersOnly.filter((s) => s.status === "signed" || s.status === "validated").length
  const progress = signersOnly.length > 0 ? (signedCount / signersOnly.length) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/client-portal/contracts"
          className="p-2 rounded-lg transition-colors hover:bg-white"
          style={{ color: "#666666" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold" style={{ color: "#111111" }}>
              {contract.title}
            </h1>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: config.bg, color: config.color }}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              {config.label}
            </span>
          </div>
          {contract.description && (
            <p className="text-sm mt-1" style={{ color: "#666666" }}>
              {contract.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: "#111111" }}>
                Progression des signatures
              </h2>
              <span className="text-sm font-medium" style={{ color: config.color }}>
                {signedCount}/{signersOnly.length}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#EEEEEE" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: config.color }}
              />
            </div>
          </div>

          {/* Signers */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: "#EEEEEE" }}>
              <h2 className="text-base font-semibold" style={{ color: "#111111" }}>
                Signataires
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "#EEEEEE" }}>
              {contract.signers.map((signer, index) => {
                const signerConfig = signerStatusConfig[signer.status] || signerStatusConfig.pending
                return (
                  <div key={signer.id} className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                        style={{ background: "#E6F0FF", color: "#0064FA" }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium" style={{ color: "#111111" }}>
                            {signer.name}
                          </p>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: signerConfig.bg, color: signerConfig.color }}
                          >
                            {signerConfig.label}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{ background: "#F5F5F7", color: "#666666" }}
                          >
                            {signerTypeLabels[signer.signerType] || signer.signerType}
                          </span>
                        </div>
                        <p className="text-sm mt-0.5" style={{ color: "#666666" }}>
                          {signer.email}
                        </p>

                        {/* Timeline */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs" style={{ color: "#999999" }}>
                          {signer.viewedAt && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Consulté le {formatDateTime(signer.viewedAt)}
                            </span>
                          )}
                          {signer.signedAt && (
                            <span className="flex items-center gap-1" style={{ color: "#28B95F" }}>
                              <CheckCircle2 className="w-3 h-3" />
                              Signé le {formatDateTime(signer.signedAt)}
                            </span>
                          )}
                          {signer.declinedAt && (
                            <span className="flex items-center gap-1" style={{ color: "#F04B69" }}>
                              <XCircle className="w-3 h-3" />
                              Refusé le {formatDateTime(signer.declinedAt)}
                            </span>
                          )}
                        </div>

                        {signer.declineReason && (
                          <p className="mt-2 text-sm p-3 rounded-lg" style={{ background: "#FEE2E8", color: "#F04B69" }}>
                            Motif : {signer.declineReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Documents */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: "#EEEEEE" }}>
              <h2 className="text-base font-semibold" style={{ color: "#111111" }}>
                Documents
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "#EEEEEE" }}>
              {contract.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 p-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "#FEE2E8" }}
                  >
                    <FileText className="w-5 h-5" style={{ color: "#F04B69" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: "#111111" }}>
                      {doc.filename}
                    </p>
                    <p className="text-xs" style={{ color: "#999999" }}>
                      {doc.pageCount} page{doc.pageCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {contract.status === "completed" && (
            <div
              className="rounded-2xl p-6 space-y-3"
              style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h2 className="text-base font-semibold mb-4" style={{ color: "#111111" }}>
                Téléchargements
              </h2>

              <button
                onClick={() => handleDownload("signed")}
                disabled={downloading === "signed"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "#28B95F", color: "#FFFFFF" }}
              >
                {downloading === "signed" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Document signé
              </button>

              <button
                onClick={() => handleDownload("audit")}
                disabled={downloading === "audit"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[#E6F0FF]"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                {downloading === "audit" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Certificat d'audit
              </button>

              <button
                onClick={() => handleDownload("original")}
                disabled={downloading === "original"}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-[#E6F0FF]"
                style={{ background: "#F5F5F7", color: "#444444" }}
              >
                {downloading === "original" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Document original
              </button>
            </div>
          )}

          {/* Info */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: "#111111" }}>
              Informations
            </h2>

            <div className="space-y-4">
              {contract.sentAt && (
                <div className="flex items-start gap-3">
                  <Send className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#999999" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#999999" }}>Envoyé le</p>
                    <p className="text-sm font-medium" style={{ color: "#111111" }}>
                      {formatDateTime(contract.sentAt)}
                    </p>
                  </div>
                </div>
              )}

              {contract.completedAt && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#28B95F" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#999999" }}>Complété le</p>
                    <p className="text-sm font-medium" style={{ color: "#28B95F" }}>
                      {formatDateTime(contract.completedAt)}
                    </p>
                  </div>
                </div>
              )}

              {contract.expiresAt && contract.status !== "completed" && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F0783C" }} />
                  <div>
                    <p className="text-xs" style={{ color: "#999999" }}>Expire le</p>
                    <p className="text-sm font-medium" style={{ color: "#F0783C" }}>
                      {formatDate(contract.expiresAt)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#999999" }} />
                <div>
                  <p className="text-xs" style={{ color: "#999999" }}>Créé le</p>
                  <p className="text-sm font-medium" style={{ color: "#111111" }}>
                    {formatDate(contract.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Help */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#E6F0FF" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#0064FA" }}
              >
                <FileSignature className="w-5 h-5" style={{ color: "#FFFFFF" }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "#111111" }}>
                  Besoin d'aide ?
                </h3>
                <p className="text-xs mt-1" style={{ color: "#666666" }}>
                  Si vous avez des questions concernant ce contrat, contactez-nous.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
