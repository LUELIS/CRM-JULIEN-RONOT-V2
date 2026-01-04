"use client"

import { useState, useRef } from "react"
import { Paperclip, Upload, X, File, Image, FileText, Download, Trash2 } from "lucide-react"

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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        onUpdate()
      }
    } catch (error) {
      console.error("Error deleting attachment:", error)
    }
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

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group"
              >
                {/* Preview or icon */}
                {isImage(attachment.mimeType) ? (
                  <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 shrink-0">
                    <img
                      src={attachment.filePath}
                      alt={attachment.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center shrink-0">
                    <FileIcon className="h-5 w-5 text-gray-500" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.fileSize)} - {attachment.uploader?.name}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={attachment.filePath}
                    download={attachment.fileName}
                    className="p-1.5 text-gray-400 hover:text-[#0064FA] hover:bg-[#0064FA]/10 rounded transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => deleteAttachment(attachment.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
