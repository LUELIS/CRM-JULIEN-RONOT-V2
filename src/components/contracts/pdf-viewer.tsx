"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
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
  Loader2
} from "lucide-react"

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Types
interface Signer {
  id: string
  name: string
  email: string
  signerType: string
}

interface FieldPosition {
  x: number
  y: number
}

interface FieldSize {
  width: number
  height: number
}

interface Field {
  id: string
  documentId: string
  signerId: string | null
  signerName: string | null
  fieldType: string
  pages: string
  position: string // JSON string
  size: string // JSON string
}

interface PDFViewerProps {
  pdfUrl: string
  documentId: string
  signers: Signer[]
  fields: Field[]
  selectedSigner: string | null
  selectedFieldType: string
  onFieldCreate: (field: {
    signerId: string
    fieldType: string
    page: number
    position: FieldPosition
    size: FieldSize
  }) => void
  onFieldMove: (fieldId: string, position: FieldPosition) => void
  onFieldResize?: (fieldId: string, position: FieldPosition, size: FieldSize) => void
  onFieldSave?: (fieldId: string, position: FieldPosition, size?: FieldSize) => void // Save position/size to backend after drag/resize
  onFieldDelete: (fieldId: string) => void
  onFieldSelect: (field: Field) => void
  onPageCountChange?: (count: number) => void
}

// Signer colors
const SIGNER_COLORS = [
  "#0064FA",
  "#28B95F",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
]

// Field type icons
const FIELD_ICONS: Record<string, typeof PenTool> = {
  signature: PenTool,
  initials: User,
  date: Calendar,
  text: Type,
  input: Type,
  name: User,
}

// Default field sizes (height is what iLoveAPI uses for size parameter)
// Based on iLoveAPI examples: signature=28-40, initials=28-40, date=10-28, name=40, text=28-40, input=30
const FIELD_SIZES: Record<string, { width: number; height: number }> = {
  signature: { width: 120, height: 28 },  // iLoveAPI minimum: 28
  initials: { width: 50, height: 20 },    // iLoveAPI: 28-40, but smaller works
  date: { width: 80, height: 14 },        // iLoveAPI: 10-28
  text: { width: 120, height: 20 },       // iLoveAPI: 28-40
  input: { width: 120, height: 20 },      // iLoveAPI: 30
  name: { width: 100, height: 28 },       // iLoveAPI: 40
}

export function PDFViewer({
  pdfUrl,
  documentId,
  signers,
  fields,
  selectedSigner,
  selectedFieldType,
  onFieldCreate,
  onFieldMove,
  onFieldResize,
  onFieldSave,
  onFieldDelete,
  onFieldSelect,
  onPageCountChange,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageDimensions, setPageDimensions] = useState({ width: 595, height: 842 }) // A4 default
  const [draggingField, setDraggingField] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [wasDragged, setWasDragged] = useState(false) // Track if drag actually happened
  const [resizingField, setResizingField] = useState<string | null>(null)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null) // 'se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n'
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, fieldX: 0, fieldY: 0 })
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null)

  const pageContainerRef = useRef<HTMLDivElement>(null)

  // Get signer color
  const getSignerColor = useCallback((signerId: string | null) => {
    if (!signerId) return "#666666"
    const index = signers.findIndex((s) => s.id === signerId)
    if (index === -1) return "#666666" // Signer not found
    return SIGNER_COLORS[index % SIGNER_COLORS.length]
  }, [signers])

  // Handle document load
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
    onPageCountChange?.(numPages)
  }

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF load error:", err)
    setError("Impossible de charger le PDF")
    setIsLoading(false)
  }

  // Handle page render
  const onPageLoadSuccess = (page: { width: number; height: number }) => {
    console.log(`[PDF Viewer] Page loaded: ${page.width}x${page.height} (current scale: ${scale})`)
    setPageDimensions({ width: page.width, height: page.height })
  }

  // Get fields for current page
  const currentPageFields = fields.filter((f) => {
    const pages = f.pages.split(",").map((p) => {
      if (p.includes("-")) {
        const [start, end] = p.split("-").map(Number)
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
      }
      return [parseInt(p)]
    }).flat()
    return pages.includes(currentPage)
  })

  // Feedback message state
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  // Handle click on page to add field
  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Check if clicking on a field (has stopPropagation)
    if (draggingField) return

    // Show feedback if no signer selected
    if (!selectedSigner) {
      setFeedbackMessage("Sélectionnez d'abord un signataire dans la barre bleue ci-dessus")
      setTimeout(() => setFeedbackMessage(null), 3000)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    console.log(`[PDF Viewer] Click: screen(${e.clientX}, ${e.clientY}), rect(${rect.left}, ${rect.top}, ${rect.width}x${rect.height}), scale=${scale}, result(${x.toFixed(1)}, ${y.toFixed(1)}), pageDim(${pageDimensions.width}x${pageDimensions.height})`)

    const fieldSize = FIELD_SIZES[selectedFieldType] || FIELD_SIZES.signature

    // Create field with position centered on click
    onFieldCreate({
      signerId: selectedSigner,
      fieldType: selectedFieldType,
      page: currentPage,
      position: {
        x: Math.max(0, Math.min(x - fieldSize.width / 2, pageDimensions.width - fieldSize.width)),
        y: Math.max(0, Math.min(y - fieldSize.height / 2, pageDimensions.height - fieldSize.height)),
      },
      size: fieldSize,
    })

    // Show success feedback
    setFeedbackMessage("Champ ajouté ! Glissez pour repositionner")
    setTimeout(() => setFeedbackMessage(null), 2000)
  }, [selectedSigner, selectedFieldType, currentPage, scale, pageDimensions, draggingField, onFieldCreate])

  // Handle field drag start
  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation()
    if (resizingField) return // Don't start drag if resizing

    const field = fields.find((f) => f.id === fieldId)
    if (!field) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setDraggingField(fieldId)
    setWasDragged(false) // Reset drag tracking
  }

  // Handle resize start
  const handleResizeMouseDown = (e: React.MouseEvent, fieldId: string, handle: string) => {
    e.stopPropagation()
    e.preventDefault()

    const field = fields.find((f) => f.id === fieldId)
    if (!field) return

    const position = JSON.parse(field.position) as FieldPosition
    const size = JSON.parse(field.size) as FieldSize

    setResizingField(fieldId)
    setResizeHandle(handle)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      fieldX: position.x,
      fieldY: position.y,
    })
    setWasDragged(true) // Prevent click from opening modal
  }

  // Handle mouse move for dragging and resizing
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Handle resizing
    if (resizingField && resizeHandle) {
      const deltaX = (e.clientX - resizeStart.x) / scale
      const deltaY = (e.clientY - resizeStart.y) / scale

      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      let newX = resizeStart.fieldX
      let newY = resizeStart.fieldY

      // Calculate new size based on handle
      if (resizeHandle.includes('e')) {
        newWidth = Math.max(40, resizeStart.width + deltaX)
      }
      if (resizeHandle.includes('w')) {
        newWidth = Math.max(40, resizeStart.width - deltaX)
        newX = resizeStart.fieldX + deltaX
      }
      if (resizeHandle.includes('s')) {
        newHeight = Math.max(20, resizeStart.height + deltaY)
      }
      if (resizeHandle.includes('n')) {
        newHeight = Math.max(20, resizeStart.height - deltaY)
        newY = resizeStart.fieldY + deltaY
      }

      // Constrain to page bounds
      newX = Math.max(0, Math.min(newX, pageDimensions.width - newWidth))
      newY = Math.max(0, Math.min(newY, pageDimensions.height - newHeight))

      onFieldResize?.(resizingField, { x: newX, y: newY }, { width: newWidth, height: newHeight })
      return
    }

    // Handle dragging
    if (!draggingField || !pageContainerRef.current) return

    // Mark that we actually dragged (to prevent click from opening modal)
    setWasDragged(true)

    const rect = pageContainerRef.current.getBoundingClientRect()
    const field = fields.find((f) => f.id === draggingField)
    if (!field) return

    const size = JSON.parse(field.size) as FieldSize
    const x = (e.clientX - rect.left - dragOffset.x) / scale
    const y = (e.clientY - rect.top - dragOffset.y) / scale

    onFieldMove(draggingField, {
      x: Math.max(0, Math.min(x, pageDimensions.width - size.width)),
      y: Math.max(0, Math.min(y, pageDimensions.height - size.height)),
    })
  }, [draggingField, resizingField, resizeHandle, resizeStart, fields, dragOffset, scale, pageDimensions, onFieldMove, onFieldResize])

  // Track mouse coordinates for display
  const handleMouseMoveForCoords = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageContainerRef.current) return
    const rect = pageContainerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    setMouseCoords({ x: Math.round(x), y: Math.round(y) })
  }, [scale])

  // Handle mouse up - save position/size if dragged/resized
  const handleMouseUp = useCallback(() => {
    if (draggingField && wasDragged) {
      // Save the new position to backend
      const field = fields.find((f) => f.id === draggingField)
      if (field) {
        const position = JSON.parse(field.position) as FieldPosition
        onFieldSave?.(draggingField, position)
      }
    }

    if (resizingField) {
      // Save the new size to backend
      const field = fields.find((f) => f.id === resizingField)
      if (field) {
        const position = JSON.parse(field.position) as FieldPosition
        const size = JSON.parse(field.size) as FieldSize
        onFieldSave?.(resizingField, position, size)
      }
    }

    setDraggingField(null)
    setResizingField(null)
    setResizeHandle(null)
  }, [draggingField, resizingField, wasDragged, fields, onFieldSave])

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(2, s + 0.25))
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25))

  return (
    <div className="relative flex flex-col h-full bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#EEEEEE" }}>
        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
          >
            <ZoomOut className="w-4 h-4" style={{ color: "#666666" }} />
          </button>
          <span className="text-xs font-medium w-12 text-center" style={{ color: "#444444" }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 2}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
          >
            <ZoomIn className="w-4 h-4" style={{ color: "#666666" }} />
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" style={{ color: "#666666" }} />
          </button>
          <span className="text-sm font-medium" style={{ color: "#444444" }}>
            {currentPage} / {numPages || "..."}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" style={{ color: "#666666" }} />
          </button>
        </div>

        {/* Field count */}
        <div className="text-xs" style={{ color: "#999999" }}>
          {currentPageFields.length} champ{currentPageFields.length !== 1 ? "s" : ""} sur cette page
        </div>
      </div>

      {/* PDF Content */}
      <div
        className="flex-1 overflow-auto p-6"
        style={{ background: "#E5E5E5" }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#0064FA" }} />
              <p className="text-sm" style={{ color: "#666666" }}>Chargement du PDF...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
              <p className="text-xs mt-1" style={{ color: "#999999" }}>
                Vérifiez que le fichier est accessible
              </p>
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="flex justify-center">
          <div
            ref={pageContainerRef}
            className="relative shadow-xl"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
            }}
            onMouseMove={handleMouseMove}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              <div
                onClick={handlePageClick}
                onMouseMove={handleMouseMoveForCoords}
                onMouseLeave={() => setMouseCoords(null)}
                className={selectedSigner ? "cursor-crosshair" : "cursor-default"}
              >
                <Page
                  pageNumber={currentPage}
                  onLoadSuccess={onPageLoadSuccess}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            </Document>

            {/* Coordinate display */}
            {mouseCoords && (() => {
              const fieldSize = FIELD_SIZES[selectedFieldType] || FIELD_SIZES.signature
              const fieldX = Math.max(0, Math.round(mouseCoords.x - fieldSize.width / 2))
              const fieldY = Math.max(0, Math.round(mouseCoords.y - fieldSize.height / 2))
              return (
                <div
                  className="absolute top-2 left-2 px-3 py-2 rounded text-xs font-mono z-50 space-y-1"
                  style={{ background: "rgba(0,0,0,0.85)", color: "#FFFFFF" }}
                >
                  <div style={{ color: "#00FF00" }}>
                    Curseur: X={mouseCoords.x} Y={mouseCoords.y}
                  </div>
                  <div style={{ color: "#FFD700", fontSize: "10px" }}>
                    → Champ {selectedFieldType}: X={fieldX} Y={fieldY}
                  </div>
                </div>
              )
            })()}

            {/* Fields overlay */}
            {!isLoading && currentPageFields.map((field) => {
              const position = JSON.parse(field.position) as FieldPosition
              const size = JSON.parse(field.size) as FieldSize
              const color = getSignerColor(field.signerId)
              const Icon = FIELD_ICONS[field.fieldType] || PenTool
              const signer = signers.find((s) => s.id === field.signerId)
              const isDragging = draggingField === field.id

              return (
                <div
                  key={field.id}
                  className={`absolute flex items-center justify-center cursor-move transition-shadow group ${
                    isDragging ? "z-10" : ""
                  }`}
                  style={{
                    left: position.x,
                    top: position.y,
                    width: size.width,
                    height: size.height,
                    background: `${color}20`,
                    border: `2px ${isDragging ? "solid" : "dashed"} ${color}`,
                    borderRadius: 4,
                    boxShadow: isDragging ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
                  }}
                  onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Don't open modal if we just finished dragging
                    if (wasDragged) {
                      setWasDragged(false)
                      return
                    }
                    onFieldSelect(field)
                  }}
                >
                  {/* Field content */}
                  <div className="flex items-center gap-1.5" style={{ color }}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium truncate max-w-[100px]">
                      {signer?.name?.split(" ")[0] || "?"}
                    </span>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onFieldDelete(field.id)
                    }}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  {/* Resize handles */}
                  {['se', 'sw', 'ne', 'nw'].map((handle) => (
                    <div
                      key={handle}
                      onMouseDown={(e) => handleResizeMouseDown(e, field.id, handle)}
                      className="absolute w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: color,
                        cursor: handle === 'se' || handle === 'nw' ? 'nwse-resize' : 'nesw-resize',
                        right: handle.includes('e') ? -6 : undefined,
                        left: handle.includes('w') ? -6 : undefined,
                        bottom: handle.includes('s') ? -6 : undefined,
                        top: handle.includes('n') ? -6 : undefined,
                      }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Feedback message toast */}
      {feedbackMessage && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl shadow-lg text-sm font-medium z-50 animate-pulse"
          style={{
            background: feedbackMessage.includes("ajouté") ? "#D4EDDA" : "#FEF3CD",
            color: feedbackMessage.includes("ajouté") ? "#28B95F" : "#B8A000",
          }}
        >
          {feedbackMessage}
        </div>
      )}

      {/* Instructions */}
      <div
        className="px-4 py-2 text-center text-xs border-t"
        style={{ borderColor: "#EEEEEE", background: "#FAFAFA", color: "#666666" }}
      >
        {selectedSigner ? (
          <>
            <strong className="text-blue-600">Cliquez</strong> pour placer un champ • <strong>Glissez</strong> pour déplacer
          </>
        ) : (
          <span style={{ color: "#DC2626", fontWeight: 500 }}>⚠ Sélectionnez un signataire ci-dessus pour ajouter des champs</span>
        )}
      </div>
    </div>
  )
}
