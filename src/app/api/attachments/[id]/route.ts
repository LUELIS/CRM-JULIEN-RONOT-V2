import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getS3Config, getPresignedDownloadUrl } from "@/lib/s3"
import { isS3Path, getS3Key } from "@/lib/file-upload"

// GET - Get attachment file (redirect to S3 presigned URL or serve local)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const attachment = await prisma.projectCardAttachment.findUnique({
      where: { id: BigInt(id) },
    })

    if (!attachment) {
      return NextResponse.json({ error: "Fichier non trouve" }, { status: 404 })
    }

    // If S3 file, redirect to presigned URL
    if (isS3Path(attachment.filePath)) {
      const s3Config = await getS3Config()
      if (!s3Config) {
        return NextResponse.json(
          { error: "Configuration S3 manquante" },
          { status: 500 }
        )
      }

      const s3Key = getS3Key(attachment.filePath)
      const presignedUrl = await getPresignedDownloadUrl(
        s3Key,
        s3Config,
        3600, // 1 hour
        attachment.fileName
      )

      return NextResponse.redirect(presignedUrl)
    }

    // Local file - redirect to public path
    return NextResponse.redirect(
      new URL(attachment.filePath, request.url)
    )
  } catch (error) {
    console.error("Error getting attachment:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
