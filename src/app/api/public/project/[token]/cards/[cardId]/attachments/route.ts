import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/file-upload"

// POST - Upload attachment as guest
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; cardId: string }> }
) {
  try {
    const { token, cardId } = await params

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const guestToken = formData.get("guestToken") as string | null

    if (!file || !guestToken) {
      return NextResponse.json(
        { error: "Fichier et token requis" },
        { status: 400 }
      )
    }

    // Find project by share token
    const project = await prisma.project.findFirst({
      where: {
        shareToken: token,
        shareEnabled: true,
      },
      include: {
        columns: {
          include: {
            cards: {
              where: { id: BigInt(cardId) },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Projet non trouve ou partage desactive" },
        { status: 404 }
      )
    }

    // Verify guest token
    const guest = await prisma.projectGuest.findFirst({
      where: {
        token: guestToken,
        projectId: project.id,
      },
    })

    if (!guest) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    // Verify card belongs to project
    const cardExists = project.columns.some((col) =>
      col.cards.some((c) => c.id.toString() === cardId)
    )
    if (!cardExists) {
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 })
    }

    // Upload file
    const uploadResult = await uploadFile(file, cardId)

    // Save to database - use a system user ID for guest uploads (0 or create guest user)
    // For now we'll create a special "guest" entry
    const attachment = await prisma.projectCardAttachment.create({
      data: {
        cardId: BigInt(cardId),
        fileName: uploadResult.fileName,
        filePath: uploadResult.filePath,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        uploadedBy: BigInt(1), // Default to user ID 1 for guest uploads
      },
    })

    // Update guest last seen
    await prisma.projectGuest.update({
      where: { id: guest.id },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({
      id: attachment.id.toString(),
      fileName: attachment.fileName,
      filePath: attachment.filePath,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
    })
  } catch (error: any) {
    console.error("Error uploading attachment:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}

// GET - List attachments for a card (guest access)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; cardId: string }> }
) {
  try {
    const { token, cardId } = await params
    const { searchParams } = new URL(request.url)
    const guestToken = searchParams.get("guestToken")

    if (!guestToken) {
      return NextResponse.json({ error: "Token requis" }, { status: 400 })
    }

    // Find project by share token
    const project = await prisma.project.findFirst({
      where: {
        shareToken: token,
        shareEnabled: true,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Projet non trouve" },
        { status: 404 }
      )
    }

    // Verify guest token
    const guest = await prisma.projectGuest.findFirst({
      where: {
        token: guestToken,
        projectId: project.id,
      },
    })

    if (!guest) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const attachments = await prisma.projectCardAttachment.findMany({
      where: { cardId: BigInt(cardId) },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(
      attachments.map((a) => ({
        id: a.id.toString(),
        fileName: a.fileName,
        filePath: a.filePath,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
      }))
    )
  } catch (error) {
    console.error("Error fetching attachments:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
