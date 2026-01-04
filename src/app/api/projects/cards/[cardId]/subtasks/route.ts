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

// GET: List subtasks for a card
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

    const subtasks = await prisma.projectSubtask.findMany({
      where: { cardId: BigInt(cardId) },
      orderBy: { position: "asc" },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(subtasks.map(serializeSubtask))
  } catch (error) {
    console.error("Error fetching subtasks:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST: Create a new subtask
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
    const { title, assigneeId, dueDate, priority } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 })
    }

    // Get the highest position
    const lastSubtask = await prisma.projectSubtask.findFirst({
      where: { cardId: BigInt(cardId) },
      orderBy: { position: "desc" },
    })

    const subtask = await prisma.projectSubtask.create({
      data: {
        cardId: BigInt(cardId),
        title: title.trim(),
        position: (lastSubtask?.position ?? -1) + 1,
        assigneeId: assigneeId ? BigInt(assigneeId) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "medium",
      },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(serializeSubtask(subtask), { status: 201 })
  } catch (error) {
    console.error("Error creating subtask:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT: Reorder subtasks
export async function PUT(
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
    const { subtasks } = body // Array of { id, position }

    if (!Array.isArray(subtasks)) {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 })
    }

    // Update positions in a transaction
    await prisma.$transaction(
      subtasks.map((st: { id: string; position: number }) =>
        prisma.projectSubtask.update({
          where: { id: BigInt(st.id) },
          data: { position: st.position },
        })
      )
    )

    // Return updated subtasks
    const updatedSubtasks = await prisma.projectSubtask.findMany({
      where: { cardId: BigInt(cardId) },
      orderBy: { position: "asc" },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(updatedSubtasks.map(serializeSubtask))
  } catch (error) {
    console.error("Error reordering subtasks:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
