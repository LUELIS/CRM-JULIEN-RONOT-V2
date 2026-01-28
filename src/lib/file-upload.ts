import { getS3Config, uploadToS3, deleteFromS3 } from "./s3"

const S3_PREFIX = "projects/attachments"
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

  // Get S3 config - required
  const s3Config = await getS3Config()
  if (!s3Config) {
    throw new Error("Configuration S3 requise. Configurez S3 dans les parametres.")
  }

  // Generate unique filename
  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const fileName = `${cardId}-${timestamp}-${sanitizedName}`
  const s3Key = `${S3_PREFIX}/${fileName}`

  // Get file buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Upload to S3
  const result = await uploadToS3(buffer, s3Key, file.type, s3Config)

  if (!result.success) {
    throw new Error(`Erreur upload S3: ${result.error}`)
  }

  return {
    fileName: file.name,
    filePath: `s3://${s3Key}`,
    fileSize: file.size,
    mimeType: file.type,
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (!filePath.startsWith("s3://")) {
      console.warn("Tentative de suppression d'un fichier local ignore:", filePath)
      return
    }

    const s3Config = await getS3Config()
    if (!s3Config) {
      console.error("Configuration S3 manquante pour suppression")
      return
    }

    const s3Key = filePath.replace("s3://", "")
    await deleteFromS3(s3Key, s3Config)
  } catch (error) {
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

// Check if a file path is on S3
export function isS3Path(filePath: string): boolean {
  return filePath.startsWith("s3://")
}

// Get the S3 key from a file path
export function getS3Key(filePath: string): string {
  return filePath.replace("s3://", "")
}
