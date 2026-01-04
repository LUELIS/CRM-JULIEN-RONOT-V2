import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// Helper to serialize BigInt values
function serializeCard(card: any) {
  return {
    ...card,
    id: card.id.toString(),
    columnId: card.columnId.toString(),
    clientId: card.clientId?.toString() || null,
    assigneeId: card.assigneeId?.toString() || null,
    client: card.client ? {
      ...card.client,
      id: card.client.id.toString(),
    } : null,
    assignee: card.assignee ? {
      id: card.assignee.id.toString(),
      name: card.assignee.name,
    } : null,
    column: card.column ? {
      ...card.column,
      id: card.column.id.toString(),
      projectId: card.column.projectId.toString(),
      project: card.column.project ? {
        ...card.column.project,
        id: card.column.project.id.toString(),
      } : null,
    } : null,
    subtasks: card.subtasks?.map((st: any) => ({
      ...st,
      id: st.id.toString(),
      cardId: st.cardId.toString(),
      assigneeId: st.assigneeId?.toString() || null,
      assignee: st.assignee ? {
        id: st.assignee.id.toString(),
        name: st.assignee.name,
      } : null,
    })) || [],
    comments: card.comments?.map((c: any) => ({
      ...c,
      id: c.id.toString(),
      cardId: c.cardId.toString(),
      userId: c.userId.toString(),
      user: c.user ? {
        id: c.user.id.toString(),
        name: c.user.name,
      } : null,
    })) || [],
    attachments: card.attachments?.map((a: any) => ({
      ...a,
      id: a.id.toString(),
      cardId: a.cardId.toString(),
      uploadedBy: a.uploadedBy.toString(),
      uploader: a.uploader ? {
        id: a.uploader.id.toString(),
        name: a.uploader.name,
      } : null,
    })) || [],
    cardLabels: card.cardLabels?.map((cl: any) => ({
      ...cl.label,
      id: cl.label.id.toString(),
      projectId: cl.label.projectId.toString(),
    })) || [],
  }
}

// GET: Get a single card
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params

    const card = await prisma.projectCard.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: {
          select: { id: true, companyName: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
        column: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
        subtasks: {
          orderBy: { position: "asc" },
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          include: {
            uploader: {
              select: { id: true, name: true },
            },
          },
        },
        cardLabels: {
          include: {
            label: true,
          },
        },
      },
    })

    if (!card) {
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 })
    }

    return NextResponse.json(serializeCard(card))
  } catch (error) {
    console.error("Error fetching card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT: Update a card
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      priority,
      labels,
      clientId,
      assigneeId,
      dueDate,
      startDate,
      estimatedHours,
      actualHours,
      isCompleted,
    } = body

    const updateData: any = {}

    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (priority !== undefined) updateData.priority = priority
    if (labels !== undefined) updateData.labels = labels ? JSON.stringify(labels) : null
    if (clientId !== undefined) updateData.clientId = clientId ? BigInt(clientId) : null
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId ? BigInt(assigneeId) : null
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours || null
    if (actualHours !== undefined) updateData.actualHours = actualHours || null
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted
      updateData.completedAt = isCompleted ? new Date() : null
    }

    const card = await prisma.projectCard.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        client: {
          select: { id: true, companyName: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
        subtasks: {
          orderBy: { position: "asc" },
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
        },
        cardLabels: {
          include: {
            label: true,
          },
        },
      },
    })

    return NextResponse.json(serializeCard(card))
  } catch (error) {
    console.error("Error updating card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: Delete a card
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params

    await prisma.projectCard.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
