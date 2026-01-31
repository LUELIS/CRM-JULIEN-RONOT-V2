import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getS3Config, getPresignedDownloadUrl } from "@/lib/s3"

// GET: Get presigned URL for an attachment
// Query params:
// - download=true: Force download with original filename
// - (default): URL for viewing/previewing
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string; id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { cardId, id } = await params
    const { searchParams } = new URL(request.url)
    const forceDownload = searchParams.get("download") === "true"

    // Get attachment from database
    const attachment = await prisma.projectCardAttachment.findFirst({
      where: {
        id: BigInt(id),
        cardId: BigInt(cardId),
      },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Piece jointe non trouvee" }, { status: 404 })
    }

    // Check if it's an S3 file
    if (!attachment.filePath.startsWith("s3://")) {
      // Return the path as-is for local files (legacy)
      return NextResponse.json({ url: attachment.filePath })
    }

    // Get S3 config
    const s3Config = await getS3Config()
    if (!s3Config) {
      return NextResponse.json(
        { error: "Configuration S3 non configuree" },
        { status: 500 }
      )
    }

    // Get S3 key from path
    const s3Key = attachment.filePath.replace("s3://", "")

    // Generate presigned URL (valid for 1 hour)
    // Only add download filename if forceDownload is true
    const url = await getPresignedDownloadUrl(
      s3Key,
      s3Config,
      3600,
      forceDownload ? attachment.fileName : undefined
    )

    return NextResponse.json({
      url,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    })
  } catch (error) {
    console.error("Error getting attachment URL:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
