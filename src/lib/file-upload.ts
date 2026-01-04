import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"

const UPLOAD_DIR = "public/uploads/projects"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]

interface UploadResult {
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
}

export async function uploadFile(
  file: File,
  cardId: string
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Type de fichier non autorise: ${file.type}`)
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`)
  }

  // Create upload directory if it doesn't exist
  const uploadPath = path.join(process.cwd(), UPLOAD_DIR)
  await mkdir(uploadPath, { recursive: true })

  // Generate unique filename
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const fileName = `${cardId}-${timestamp}-${sanitizedName}`
  const filePath = path.join(uploadPath, fileName)

  // Write file
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(filePath, buffer)

  return {
    fileName: file.name,
    filePath: `/uploads/projects/${fileName}`,
    fileSize: file.size,
    mimeType: file.type,
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(process.cwd(), "public", filePath)
    await unlink(fullPath)
  } catch (error) {
    // Ignore errors if file doesn't exist
    console.error("Error deleting file:", error)
  }
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType === "application/pdf") return "pdf"
  if (mimeType.includes("word")) return "doc"
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "excel"
  if (mimeType.startsWith("text/")) return "text"
  return "file"
}
