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

// PUT: Update a comment
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ cardId: string; id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: "Le contenu est requis" }, { status: 400 })
    }

    // Check if user owns the comment
    const existingComment = await prisma.projectCardComment.findUnique({
      where: { id: BigInt(id) },
    })

    if (!existingComment) {
      return NextResponse.json({ error: "Commentaire non trouve" }, { status: 404 })
    }

    if (existingComment.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Non autorise a modifier ce commentaire" }, { status: 403 })
    }

    const comment = await prisma.projectCardComment.update({
      where: { id: BigInt(id) },
      data: { content: content.trim() },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(serializeComment(comment))
  } catch (error) {
    console.error("Error updating comment:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: Delete a comment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cardId: string; id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params

    // Check if user owns the comment
    const existingComment = await prisma.projectCardComment.findUnique({
      where: { id: BigInt(id) },
    })

    if (!existingComment) {
      return NextResponse.json({ error: "Commentaire non trouve" }, { status: 404 })
    }

    if (existingComment.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Non autorise a supprimer ce commentaire" }, { status: 403 })
    }

    await prisma.projectCardComment.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
