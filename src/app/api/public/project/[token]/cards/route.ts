import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Create a new card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { guestToken, columnId, title, description, priority } = body

    if (!guestToken || !columnId || !title) {
      return NextResponse.json(
        { error: "Donnees manquantes" },
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
        columns: true,
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

    // Verify column belongs to project
    const column = project.columns.find((c) => c.id.toString() === columnId)
    if (!column) {
      return NextResponse.json({ error: "Colonne non trouvee" }, { status: 404 })
    }

    // Get max position in column
    const maxPositionCard = await prisma.projectCard.findFirst({
      where: { columnId: BigInt(columnId) },
      orderBy: { position: "desc" },
    })
    const newPosition = (maxPositionCard?.position ?? -1) + 1

    // Create card
    const card = await prisma.projectCard.create({
      data: {
        columnId: BigInt(columnId),
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "medium",
        position: newPosition,
      },
    })

    // Update guest last seen
    await prisma.projectGuest.update({
      where: { id: guest.id },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({
      id: card.id.toString(),
      title: card.title,
      description: card.description,
      position: card.position,
      priority: card.priority,
    })
  } catch (error) {
    console.error("Error creating card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
