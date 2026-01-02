"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  PenTool,
  User,
  Calendar,
  Type,
  Trash2,
  Move,
  Check
} from "lucide-react"
import { Button } from "@/components/ui/button"

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Types
interface FieldPosition {
  x: number
  y: number
  page: number
}

interface FieldSize {
  width: number
  height: number
}

interface SignatureField {
  id: string
  signerId: string
  fieldType: "signature" | "initials" | "date" | "text" | "checkbox"
  position: FieldPosition
  size: FieldSize
  required: boolean
  label?: string
}

interface Signer {
  id: string
  name: string
  email: string
  color?: string
}

interface PDFFieldEditorProps {
  pdfUrl: string
  documentId: string
  signers: Signer[]
  initialFields?: SignatureField[]
  onFieldsChange: (fields: SignatureField[]) => void
}

// Default colors for signers
const SIGNER_COLORS = [
  "#0064FA", // Blue
  "#28B95F", // Green
  "#F59E0B", // Orange
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
]

// Field type definitions
const FIELD_TYPES = [
  { value: "signature", label: "Signature", icon: PenTool, defaultSize: { width: 200, height: 60 } },
  { value: "initials", label: "Paraphe", icon: User, defaultSize: { width: 80, height: 40 } },
  { value: "date", label: "Date", icon: Calendar, defaultSize: { width: 120, height: 30 } },
  { value: "text", label: "Texte", icon: Type, defaultSize: { width: 200, height: 30 } },
  { value: "checkbox", label: "Case", icon: Check, defaultSize: { width: 24, height: 24 } },
]

export function PDFFieldEditor({
  pdfUrl,
  documentId,
  signers,
  initialFields = [],
  onFieldsChange,
}: PDFFieldEditorProps) {
  // State
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [fields, setFields] = useState<SignatureField[]>(initialFields)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [selectedSigner, setSelectedSigner] = useState<string | null>(signers[0]?.id || null)
  const [selectedFieldType, setSelectedFieldType] = useState<string>("signature")
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 })

  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  // Assign colors to signers
  const signersWithColors = signers.map((signer, index) => ({
    ...signer,
    color: signer.color || SIGNER_COLORS[index % SIGNER_COLORS.length],
  }))

  // Get signer color
  const getSignerColor = (signerId: string) => {
    const signer = signersWithColors.find((s) => s.id === signerId)
    return signer?.color || "#0064FA"
  }

  // Get signer name
  const getSignerName = (signerId: string) => {
    const signer = signers.find((s) => s.id === signerId)
    return signer?.name || "Inconnu"
  }

  // Handle PDF load
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
  }

  // Handle page render
  const onPageLoadSuccess = (page: { width: number; height: number }) => {
    setPdfDimensions({ width: page.width, height: page.height })
  }

  // Update parent when fields change
  useEffect(() => {
    onFieldsChange(fields)
  }, [fields, onFieldsChange])

  // Handle click on PDF to add field
  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedSigner || isDragging) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale

      const fieldType = FIELD_TYPES.find((t) => t.value === selectedFieldType)
      if (!fieldType) return

      const newField: SignatureField = {
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        signerId: selectedSigner,
        fieldType: selectedFieldType as SignatureField["fieldType"],
        position: {
          x: Math.max(0, x - fieldType.defaultSize.width / 2),
          y: Math.max(0, y - fieldType.defaultSize.height / 2),
          page: currentPage,
        },
        size: fieldType.defaultSize,
        required: true,
      }

      setFields((prev) => [...prev, newField])
      setSelectedField(newField.id)
    },
    [selectedSigner, selectedFieldType, currentPage, scale, isDragging]
  )

  // Handle field drag start
  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation()
    const field = fields.find((f) => f.id === fieldId)
    if (!field) return

    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setSelectedField(fieldId)
    setIsDragging(true)
  }

  // Handle field drag
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !selectedField || !pageRef.current) return

      const rect = pageRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - dragOffset.x) / scale
      const y = (e.clientY - rect.top - dragOffset.y) / scale

      setFields((prev) =>
        prev.map((field) =>
          field.id === selectedField
            ? {
                ...field,
                position: {
                  ...field.position,
                  x: Math.max(0, Math.min(x, pdfDimensions.width - field.size.width)),
                  y: Math.max(0, Math.min(y, pdfDimensions.height - field.size.height)),
                },
              }
            : field
        )
      )
    },
    [isDragging, selectedField, dragOffset, scale, pdfDimensions]
  )

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Delete selected field
  const deleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId))
    if (selectedField === fieldId) {
      setSelectedField(null)
    }
  }

  // Get fields for current page
  const currentPageFields = fields.filter((f) => f.position.page === currentPage)

  // Get field icon
  const getFieldIcon = (fieldType: string) => {
    const type = FIELD_TYPES.find((t) => t.value === fieldType)
    return type?.icon || PenTool
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: "#EEEEEE", background: "#FAFAFA" }}
      >
        {/* Left: Signer selection */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "#666666" }}>
            Signataire :
          </span>
          <div className="flex gap-1">
            {signersWithColors.map((signer) => (
              <button
                key={signer.id}
                onClick={() => setSelectedSigner(signer.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedSigner === signer.id ? "" : "opacity-60 hover:opacity-100"
                }`}
                style={{
                  background: `${signer.color}15`,
                  color: signer.color,
                  boxShadow: selectedSigner === signer.id ? `0 0 0 2px white, 0 0 0 4px ${signer.color}` : undefined,
                }}
              >
                {signer.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Field type selection */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "#FFFFFF", border: "1px solid #EEEEEE" }}>
          {FIELD_TYPES.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.value}
                onClick={() => setSelectedFieldType(type.value)}
                className={`p-2 rounded-lg transition-all ${
                  selectedFieldType === type.value ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
                style={{
                  color: selectedFieldType === type.value ? "#0064FA" : "#666666",
                }}
                title={type.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>

        {/* Right: Zoom & page navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" style={{ color: "#666666" }} />
            </button>
            <span className="text-sm font-medium w-12 text-center" style={{ color: "#444444" }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2, s + 0.25))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={scale >= 2}
            >
              <ZoomIn className="w-4 h-4" style={{ color: "#666666" }} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" style={{ color: "#666666" }} />
            </button>
            <span className="text-sm font-medium" style={{ color: "#444444" }}>
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" style={{ color: "#666666" }} />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-6"
        style={{ background: "#E5E5E5" }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-sm" style={{ color: "#666666" }}>Chargement du PDF...</p>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div
            ref={pageRef}
            className="relative shadow-xl bg-white"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
            onMouseMove={handleMouseMove}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading=""
              error={
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <p className="text-sm" style={{ color: "#DC2626" }}>
                    Erreur lors du chargement du PDF
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#999999" }}>
                    Vérifiez que le fichier est accessible
                  </p>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                onClick={handlePageClick}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="cursor-crosshair"
              />
            </Document>

            {/* Fields overlay */}
            {currentPageFields.map((field) => {
              const FieldIcon = getFieldIcon(field.fieldType)
              const color = getSignerColor(field.signerId)
              const isSelected = selectedField === field.id

              return (
                <div
                  key={field.id}
                  className="absolute flex items-center justify-center cursor-move transition-shadow"
                  style={{
                    left: field.position.x,
                    top: field.position.y,
                    width: field.size.width,
                    height: field.size.height,
                    background: `${color}20`,
                    border: `2px ${isSelected ? "solid" : "dashed"} ${color}`,
                    borderRadius: 4,
                    boxShadow: isSelected ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                  }}
                  onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedField(field.id)
                  }}
                >
                  <div className="flex items-center gap-1.5" style={{ color }}>
                    <FieldIcon className="w-4 h-4" />
                    <span className="text-xs font-medium truncate max-w-[120px]">
                      {getSignerName(field.signerId).split(" ")[0]}
                    </span>
                  </div>

                  {/* Delete button on hover/select */}
                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteField(field.id)
                      }}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  {/* Drag handle indicator */}
                  <div
                    className="absolute -bottom-1 -right-1 p-0.5 rounded-sm"
                    style={{ background: color }}
                  >
                    <Move className="w-2 h-2 text-white" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div
        className="p-3 text-center text-xs border-t"
        style={{ borderColor: "#EEEEEE", background: "#FAFAFA", color: "#666666" }}
      >
        <strong>Cliquez</strong> sur le document pour placer un champ • <strong>Glissez</strong> pour déplacer • <strong>Sélectionnez</strong> et appuyez sur ✕ pour supprimer
      </div>
    </div>
  )
}
