import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function serializeSubtask(subtask: any) {
  return {
    ...subtask,
    id: subtask.id.toString(),
    cardId: subtask.cardId.toString(),
    assigneeId: subtask.assigneeId?.toString() || null,
    assignee: subtask.assignee ? {
      id: subtask.assignee.id.toString(),
      name: subtask.assignee.name,
    } : null,
  }
}

// PUT: Update a subtask
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ cardId: string; id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, isCompleted, assigneeId, dueDate, priority } = body

    const updateData: any = {}

    if (title !== undefined) updateData.title = title.trim()
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId ? BigInt(assigneeId) : null
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (priority !== undefined) updateData.priority = priority

    const subtask = await prisma.projectSubtask.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(serializeSubtask(subtask))
  } catch (error) {
    console.error("Error updating subtask:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: Delete a subtask
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cardId: string; id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id } = await params

    await prisma.projectSubtask.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting subtask:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
