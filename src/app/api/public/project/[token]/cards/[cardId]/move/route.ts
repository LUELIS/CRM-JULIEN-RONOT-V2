import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Move a card to a different column/position
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; cardId: string }> }
) {
  try {
    const { token, cardId } = await params
    const body = await request.json()
    const { guestToken, columnId, position } = body

    if (!guestToken || !columnId || position === undefined) {
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

    // Get the card and verify it belongs to this project
    const card = await prisma.projectCard.findFirst({
      where: {
        id: BigInt(cardId),
        column: {
          projectId: project.id,
        },
      },
    })

    if (!card) {
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 })
    }

    const oldColumnId = card.columnId
    const newColumnId = BigInt(columnId)
    const newPosition = position

    // If moving to same column
    if (oldColumnId === newColumnId) {
      const oldPosition = card.position

      if (newPosition > oldPosition) {
        // Moving down - decrease position of cards in between
        await prisma.projectCard.updateMany({
          where: {
            columnId: oldColumnId,
            position: { gt: oldPosition, lte: newPosition },
          },
          data: { position: { decrement: 1 } },
        })
      } else if (newPosition < oldPosition) {
        // Moving up - increase position of cards in between
        await prisma.projectCard.updateMany({
          where: {
            columnId: oldColumnId,
            position: { gte: newPosition, lt: oldPosition },
          },
          data: { position: { increment: 1 } },
        })
      }
    } else {
      // Moving to different column
      // Decrease position of cards after old position in old column
      await prisma.projectCard.updateMany({
        where: {
          columnId: oldColumnId,
          position: { gt: card.position },
        },
        data: { position: { decrement: 1 } },
      })

      // Increase position of cards at or after new position in new column
      await prisma.projectCard.updateMany({
        where: {
          columnId: newColumnId,
          position: { gte: newPosition },
        },
        data: { position: { increment: 1 } },
      })
    }

    // Update card position and column
    await prisma.projectCard.update({
      where: { id: BigInt(cardId) },
      data: {
        columnId: newColumnId,
        position: newPosition,
      },
    })

    // Update guest last seen
    await prisma.projectGuest.update({
      where: { id: guest.id },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error moving card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
