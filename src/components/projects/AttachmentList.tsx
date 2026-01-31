"use client"

import { useState, useRef, useEffect } from "react"
import { Paperclip, Upload, X, File, Image, FileText, Download, Trash2, Loader2, Eye, Maximize2 } from "lucide-react"

interface Attachment {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  createdAt: string
  uploader: { id: string; name: string } | null
}

interface AttachmentListProps {
  cardId: string
  attachments: Attachment[]
  onUpdate: () => void
}

export default function AttachmentList({ cardId, attachments, onUpdate }: AttachmentListProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({})
  const [presignedUrls, setPresignedUrls] = useState<Record<string, string>>({})
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch presigned URLs for S3 attachments
  useEffect(() => {
    const fetchUrls = async () => {
      for (const attachment of attachments) {
        // Skip if we already have the URL or if it's not an S3 path
        if (presignedUrls[attachment.id] || !attachment.filePath.startsWith("s3://")) {
          continue
        }

        setLoadingUrls((prev) => ({ ...prev, [attachment.id]: true }))

        try {
          const res = await fetch(`/api/projects/cards/${cardId}/attachments/${attachment.id}/url`)
          if (res.ok) {
            const data = await res.json()
            setPresignedUrls((prev) => ({ ...prev, [attachment.id]: data.url }))
          }
        } catch (error) {
          console.error("Error fetching presigned URL:", error)
        } finally {
          setLoadingUrls((prev) => ({ ...prev, [attachment.id]: false }))
        }
      }
    }

    fetchUrls()
  }, [attachments, cardId])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image
    if (mimeType === "application/pdf" || mimeType.includes("document")) return FileText
    return File
  }

  const getAttachmentUrl = (attachment: Attachment): string | null => {
    // Use presigned URL if available
    if (presignedUrls[attachment.id]) {
      return presignedUrls[attachment.id]
    }
    // Use direct path for non-S3 files
    if (!attachment.filePath.startsWith("s3://")) {
      return attachment.filePath
    }
    return null
  }

  const canPreview = (mimeType: string) => {
    return mimeType.startsWith("image/") || mimeType === "application/pdf"
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/projects/cards/${cardId}/attachments`, {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        onUpdate()
      } else {
        const data = await res.json()
        alert(data.error || "Erreur lors de l'upload")
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm("Supprimer cette piece jointe ?")) return

    try {
      const res = await fetch(`/api/projects/cards/${cardId}/attachments/${attachmentId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        // Clear cached URL
        setPresignedUrls((prev) => {
          const next = { ...prev }
          delete next[attachmentId]
          return next
        })
        onUpdate()
      }
    } catch (error) {
      console.error("Error deleting attachment:", error)
    }
  }

  const handlePreview = async (attachment: Attachment) => {
    setPreviewAttachment(attachment)
    setPreviewLoading(true)

    try {
      // Fetch URL for viewing (no download disposition)
      const res = await fetch(`/api/projects/cards/${cardId}/attachments/${attachment.id}/url`)
      if (res.ok) {
        const data = await res.json()
        setPreviewUrl(data.url)
      }
    } catch (error) {
      console.error("Error fetching preview URL:", error)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      // Fetch URL with download=true for forced download
      const res = await fetch(`/api/projects/cards/${cardId}/attachments/${attachment.id}/url?download=true`)
      if (res.ok) {
        const data = await res.json()
        // Open in new tab to trigger download
        window.open(data.url, "_blank")
      }
    } catch (error) {
      console.error("Error fetching download URL:", error)
      alert("Erreur lors du telechargement")
    }
  }

  const closePreview = () => {
    setPreviewAttachment(null)
    setPreviewUrl(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const isImage = (mimeType: string) => mimeType.startsWith("image/")
  const isPdf = (mimeType: string) => mimeType === "application/pdf"

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">
          Pieces jointes
        </span>
        {attachments.length > 0 && (
          <span className="text-xs text-gray-500">
            ({attachments.length})
          </span>
        )}
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-[#0064FA] bg-[#0064FA]/5"
            : "border-gray-300 hover:border-gray-400"
        } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">
          {uploading ? "Upload en cours..." : "Glissez un fichier ou cliquez pour selectionner"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Max 10MB - Images, PDF, Documents
        </p>
      </div>

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.mimeType)
            const url = getAttachmentUrl(attachment)
            const isLoading = loadingUrls[attachment.id]
            const previewable = canPreview(attachment.mimeType)

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
              >
                {/* Preview or icon */}
                {isImage(attachment.mimeType) ? (
                  <div
                    className="w-10 h-10 rounded overflow-hidden bg-gray-200 shrink-0 cursor-pointer relative group/thumb"
                    onClick={() => handlePreview(attachment)}
                  >
                    {isLoading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    ) : url ? (
                      <>
                        <img
                          src={url}
                          alt={attachment.fileName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="h-4 w-4 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`w-10 h-10 rounded bg-gray-200 flex items-center justify-center shrink-0 ${previewable ? "cursor-pointer hover:bg-gray-300" : ""}`}
                    onClick={() => previewable && handlePreview(attachment)}
                  >
                    <FileIcon className="h-5 w-5 text-gray-500" />
                  </div>
                )}

                {/* Info */}
                <div
                  className={`flex-1 min-w-0 ${previewable ? "cursor-pointer" : ""}`}
                  onClick={() => previewable && handlePreview(attachment)}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.fileSize)} - {attachment.uploader?.name}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {previewable && (
                    <button
                      onClick={() => handlePreview(attachment)}
                      className="p-1.5 text-gray-400 hover:text-[#0064FA] hover:bg-[#0064FA]/10 rounded transition-colors"
                      title="Visualiser"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(attachment)}
                    className="p-1.5 text-gray-400 hover:text-[#0064FA] hover:bg-[#0064FA]/10 rounded transition-colors"
                    title="Telecharger"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteAttachment(attachment.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <>
          <div
            className="fixed inset-0 bg-black/80 z-[60]"
            onClick={closePreview}
          />
          <div className="fixed inset-4 z-[60] flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  {isImage(previewAttachment.mimeType) ? (
                    <Image className="h-5 w-5 text-gray-400 shrink-0" />
                  ) : (
                    <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                  )}
                  <span className="font-medium text-gray-900 truncate">
                    {previewAttachment.fileName}
                  </span>
                  <span className="text-sm text-gray-500 shrink-0">
                    ({formatFileSize(previewAttachment.fileSize)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(previewAttachment)}
                    className="p-2 text-gray-400 hover:text-[#0064FA] hover:bg-[#0064FA]/10 rounded-lg transition-colors"
                    title="Telecharger"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={closePreview}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0064FA]" />
                    <span className="text-sm text-gray-500">Chargement...</span>
                  </div>
                ) : previewUrl ? (
                  isImage(previewAttachment.mimeType) ? (
                    <img
                      src={previewUrl}
                      alt={previewAttachment.fileName}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    />
                  ) : isPdf(previewAttachment.mimeType) ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-[70vh] rounded-lg border border-gray-200"
                      title={previewAttachment.fileName}
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <File className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p>Apercu non disponible</p>
                      <button
                        onClick={() => handleDownload(previewAttachment)}
                        className="mt-4 px-4 py-2 bg-[#0064FA] text-white rounded-lg text-sm font-medium hover:bg-[#0052CC]"
                      >
                        Telecharger
                      </button>
                    </div>
                  )
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Erreur de chargement</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
