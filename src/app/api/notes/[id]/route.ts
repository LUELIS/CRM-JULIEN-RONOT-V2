import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET - Get a single note
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const noteId = BigInt(id)

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        author: {
          select: { id: true, name: true },
        },
        tags: {
          include: { tag: true },
        },
        entityLinks: true,
        attachments: true,
        comments: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        history: {
          orderBy: { version: "desc" },
          take: 10,
        },
      },
    })

    if (!note) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 })
    }

    return NextResponse.json({
      id: note.id.toString(),
      content: note.content,
      type: note.type,
      isTop: note.isTop,
      isArchived: note.isArchived,
      isRecycle: note.isRecycle,
      isShare: note.isShare,
      shareToken: note.shareToken,
      sharePassword: note.sharePassword ? true : false,
      shareExpiryDate: note.shareExpiryDate?.toISOString() || null,
      reminderAt: note.reminderAt?.toISOString() || null,
      reminderSent: note.reminderSent,
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
      attachments: note.attachments.map((a) => ({
        id: a.id.toString(),
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
        path: a.path,
        createdAt: a.createdAt.toISOString(),
      })),
      comments: note.comments.map((c) => ({
        id: c.id.toString(),
        content: c.content,
        parentId: c.parentId?.toString() || null,
        createdAt: c.createdAt.toISOString(),
        user: c.user
          ? { id: c.user.id.toString(), name: c.user.name }
          : null,
      })),
      historyCount: note.history.length,
    })
  } catch (error) {
    console.error("Error fetching note:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la note" },
      { status: 500 }
    )
  }
}

// PUT - Update a note
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
    const noteId = BigInt(id)
    const body = await request.json()
    const userId = BigInt(session.user.id)

    // Get current note for history
    const currentNote = await prisma.note.findUnique({
      where: { id: noteId },
      include: { history: { orderBy: { version: "desc" }, take: 1 } },
    })

    if (!currentNote) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 })
    }

    // Save current version to history if content changed
    if (body.content !== undefined && body.content !== currentNote.content) {
      const lastVersion = currentNote.history[0]?.version || 0
      await prisma.noteHistory.create({
        data: {
          noteId,
          content: currentNote.content,
          version: lastVersion + 1,
          changedBy: userId,
        },
      })
    }

    // Update the note
    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        content: body.content !== undefined ? body.content : undefined,
        type: body.type !== undefined ? body.type : undefined,
        isTop: body.isTop !== undefined ? body.isTop : undefined,
        isArchived: body.isArchived !== undefined ? body.isArchived : undefined,
        isRecycle: body.isRecycle !== undefined ? body.isRecycle : undefined,
        reminderAt: body.reminderAt !== undefined
          ? (body.reminderAt ? new Date(body.reminderAt) : null)
          : undefined,
      },
      include: {
        author: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        entityLinks: true,
      },
    })

    // Update tags if provided
    if (body.tagIds !== undefined) {
      await prisma.noteTag.deleteMany({ where: { noteId } })
      if (body.tagIds.length > 0) {
        await prisma.noteTag.createMany({
          data: body.tagIds.map((tagId: string) => ({
            noteId,
            tagId: BigInt(tagId),
          })),
        })
      }
    }

    // Update entity links if provided
    if (body.entityLinks !== undefined) {
      await prisma.noteEntityLink.deleteMany({ where: { noteId } })
      if (body.entityLinks.length > 0) {
        await prisma.noteEntityLink.createMany({
          data: body.entityLinks.map((link: { entityType: string; entityId: string }) => ({
            noteId,
            entityType: link.entityType,
            entityId: BigInt(link.entityId),
          })),
        })
      }
    }

    // Fetch updated note
    const finalNote = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        author: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        entityLinks: true,
        attachments: true,
        comments: { select: { id: true } },
      },
    })

    return NextResponse.json({
      id: finalNote!.id.toString(),
      content: finalNote!.content,
      type: finalNote!.type,
      isTop: finalNote!.isTop,
      isArchived: finalNote!.isArchived,
      isShare: finalNote!.isShare,
      reminderAt: finalNote!.reminderAt?.toISOString() || null,
      createdAt: finalNote!.createdAt.toISOString(),
      updatedAt: finalNote!.updatedAt.toISOString(),
      author: {
        id: finalNote!.author.id.toString(),
        name: finalNote!.author.name,
      },
      tags: finalNote!.tags.map((t) => ({
        id: t.tag.id.toString(),
        name: t.tag.name,
        color: t.tag.color,
        icon: t.tag.icon,
      })),
      entityLinks: finalNote!.entityLinks.map((l) => ({
        id: l.id.toString(),
        entityType: l.entityType,
        entityId: l.entityId.toString(),
      })),
      attachmentCount: finalNote!.attachments.length,
      commentCount: finalNote!.comments.length,
    })
  } catch (error) {
    console.error("Error updating note:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la note" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a note (soft delete to recycle)
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
    const noteId = BigInt(id)
    const searchParams = request.nextUrl.searchParams
    const permanent = searchParams.get("permanent") === "true"

    const note = await prisma.note.findUnique({ where: { id: noteId } })
    if (!note) {
      return NextResponse.json({ error: "Note non trouvée" }, { status: 404 })
    }

    if (permanent) {
      // Permanent delete
      await prisma.note.delete({ where: { id: noteId } })
      return NextResponse.json({ success: true, message: "Note supprimée définitivement" })
    } else {
      // Soft delete to recycle bin
      await prisma.note.update({
        where: { id: noteId },
        data: { isRecycle: true },
      })
      return NextResponse.json({ success: true, message: "Note déplacée dans la corbeille" })
    }
  } catch (error) {
    console.error("Error deleting note:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la note" },
      { status: 500 }
    )
  }
}
