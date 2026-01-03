import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET - Get notes for a specific entity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; entityId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { type, entityId } = await params
    const tenantId = BigInt(1)

    const notes = await prisma.note.findMany({
      where: {
        tenant_id: tenantId,
        isRecycle: false,
        entityLinks: {
          some: {
            entityType: type,
            entityId: BigInt(entityId),
          },
        },
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
        entityLinks: true,
        attachments: {
          select: { id: true, filename: true, mimeType: true },
        },
        comments: {
          select: { id: true },
        },
      },
      orderBy: [
        { isTop: "desc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json({
      notes: notes.map((note) => ({
        id: note.id.toString(),
        content: note.content,
        type: note.type,
        isTop: note.isTop,
        isArchived: note.isArchived,
        isShare: note.isShare,
        reminderAt: note.reminderAt?.toISOString() || null,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        author: {
          id: note.author.id.toString(),
          name: note.author.name,
        },
        tags: note.tags.map((t) => ({
          id: t.tag.id.toString(),
          name: t.tag.name,
          color: t.tag.color,
          icon: t.tag.icon,
        })),
        entityLinks: note.entityLinks.map((l) => ({
          id: l.id.toString(),
          entityType: l.entityType,
          entityId: l.entityId.toString(),
        })),
        attachmentCount: note.attachments.length,
        commentCount: note.comments.length,
      })),
      entityType: type,
      entityId,
    })
  } catch (error) {
    console.error("Error fetching entity notes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des notes" },
      { status: 500 }
    )
  }
}
