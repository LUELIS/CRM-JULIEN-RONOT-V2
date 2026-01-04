import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST: Create a new card
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const body = await request.json()
    const {
      columnId,
      title,
      description,
      priority,
      labels,
      clientId,
      dueDate,
      startDate,
      estimatedHours,
    } = body

    if (!columnId) {
      return NextResponse.json({ error: "columnId requis" }, { status: 400 })
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 })
    }

    // Get the highest position in the column
    const lastCard = await prisma.projectCard.findFirst({
      where: { columnId: BigInt(columnId) },
      orderBy: { position: "desc" },
    })

    const card = await prisma.projectCard.create({
      data: {
        columnId: BigInt(columnId),
        title: title.trim(),
        description: description?.trim() || null,
        position: (lastCard?.position ?? -1) + 1,
        priority: priority || "medium",
        labels: labels ? JSON.stringify(labels) : null,
        clientId: clientId ? BigInt(clientId) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        estimatedHours: estimatedHours || null,
      },
      include: {
        client: {
          select: { id: true, companyName: true },
        },
      },
    })

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    console.error("Error creating card:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
