import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// PUT - Update a tag
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const tagId = BigInt(id)
    const body = await request.json()

    const tag = await prisma.noteTagDefinition.update({
      where: { id: tagId },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        color: body.color !== undefined ? body.color : undefined,
        icon: body.icon !== undefined ? body.icon : undefined,
        parentId: body.parentId !== undefined
          ? (body.parentId ? BigInt(body.parentId) : null)
          : undefined,
      },
    })

    return NextResponse.json({
      id: tag.id.toString(),
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      parentId: tag.parentId?.toString() || null,
      createdAt: tag.createdAt.toISOString(),
    })
  } catch (error) {
    console.error("Error updating tag:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du tag" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const tagId = BigInt(id)

    await prisma.noteTagDefinition.delete({
      where: { id: tagId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tag:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du tag" },
      { status: 500 }
    )
  }
}
