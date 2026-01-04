import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function serializeLabel(label: any) {
  return {
    ...label,
    id: label.id.toString(),
    projectId: label.projectId.toString(),
  }
}

// GET: Get labels for a card
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

    const cardLabels = await prisma.projectCardLabel.findMany({
      where: { cardId: BigInt(cardId) },
      include: {
        label: true,
      },
    })

    return NextResponse.json(cardLabels.map(cl => serializeLabel(cl.label)))
  } catch (error) {
    console.error("Error fetching card labels:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST: Add a label to a card
export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { cardId } = await params
    const body = await request.json()
    const { labelId } = body

    if (!labelId) {
      return NextResponse.json({ error: "labelId requis" }, { status: 400 })
    }

    // Check if already exists
    const existing = await prisma.projectCardLabel.findUnique({
      where: {
        cardId_labelId: {
          cardId: BigInt(cardId),
          labelId: BigInt(labelId),
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Label deja ajoute" }, { status: 400 })
    }

    await prisma.projectCardLabel.create({
      data: {
        cardId: BigInt(cardId),
        labelId: BigInt(labelId),
      },
    })

    // Return updated labels
    const cardLabels = await prisma.projectCardLabel.findMany({
      where: { cardId: BigInt(cardId) },
      include: {
        label: true,
      },
    })

    return NextResponse.json(cardLabels.map(cl => serializeLabel(cl.label)), { status: 201 })
  } catch (error) {
    console.error("Error adding label to card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: Remove a label from a card
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { cardId } = await params
    const { searchParams } = new URL(request.url)
    const labelId = searchParams.get("labelId")

    if (!labelId) {
      return NextResponse.json({ error: "labelId requis" }, { status: 400 })
    }

    await prisma.projectCardLabel.delete({
      where: {
        cardId_labelId: {
          cardId: BigInt(cardId),
          labelId: BigInt(labelId),
        },
      },
    })

    // Return updated labels
    const cardLabels = await prisma.projectCardLabel.findMany({
      where: { cardId: BigInt(cardId) },
      include: {
        label: true,
      },
    })

    return NextResponse.json(cardLabels.map(cl => serializeLabel(cl.label)))
  } catch (error) {
    console.error("Error removing label from card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
