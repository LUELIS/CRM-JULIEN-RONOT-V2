import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { uploadFile } from "@/lib/file-upload"

function serializeAttachment(attachment: any) {
  return {
    ...attachment,
    id: attachment.id.toString(),
    cardId: attachment.cardId.toString(),
    uploadedBy: attachment.uploadedBy.toString(),
    uploader: attachment.uploader ? {
      id: attachment.uploader.id.toString(),
      name: attachment.uploader.name,
    } : null,
  }
}

// GET: List attachments for a card
export async function GET(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { cardId } = await params

    const attachments = await prisma.projectCardAttachment.findMany({
      where: { cardId: BigInt(cardId) },
      orderBy: { createdAt: "desc" },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(attachments.map(serializeAttachment))
  } catch (error) {
    console.error("Error fetching attachments:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST: Upload a new attachment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { cardId } = await params

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Upload file
    const uploadResult = await uploadFile(file, cardId)

    // Save to database
    const attachment = await prisma.projectCardAttachment.create({
      data: {
        cardId: BigInt(cardId),
        fileName: uploadResult.fileName,
        filePath: uploadResult.filePath,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        uploadedBy: BigInt(session.user.id),
      },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(serializeAttachment(attachment), { status: 201 })
  } catch (error: any) {
    console.error("Error uploading attachment:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
