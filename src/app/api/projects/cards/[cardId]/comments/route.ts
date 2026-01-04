import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function serializeComment(comment: any) {
  return {
    ...comment,
    id: comment.id.toString(),
    cardId: comment.cardId.toString(),
    userId: comment.userId.toString(),
    user: comment.user ? {
      id: comment.user.id.toString(),
      name: comment.user.name,
    } : null,
  }
}

// GET: List comments for a card
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

    const comments = await prisma.projectCardComment.findMany({
      where: { cardId: BigInt(cardId) },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(comments.map(serializeComment))
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST: Create a new comment
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
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: "Le contenu est requis" }, { status: 400 })
    }

    const comment = await prisma.projectCardComment.create({
      data: {
        cardId: BigInt(cardId),
        userId: BigInt(session.user.id),
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(serializeComment(comment), { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
