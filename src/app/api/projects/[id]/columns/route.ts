import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// POST: Create a new column in a project
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { name, color, limit } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 })
    }

    // Get the highest position
    const lastColumn = await prisma.projectColumn.findFirst({
      where: { projectId: BigInt(projectId) },
      orderBy: { position: "desc" },
    })

    const column = await prisma.projectColumn.create({
      data: {
        projectId: BigInt(projectId),
        name: name.trim(),
        color: color || "#E5E7EB",
        position: (lastColumn?.position ?? -1) + 1,
        limit: limit || null,
      },
      include: {
        cards: true,
      },
    })

    return NextResponse.json(column, { status: 201 })
  } catch (error) {
    console.error("Error creating column:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT: Reorder columns
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { columns } = body // Array of { id, position }

    if (!Array.isArray(columns)) {
      return NextResponse.json({ error: "Format invalide" }, { status: 400 })
    }

    // Update positions in a transaction
    await prisma.$transaction(
      columns.map((col: { id: string; position: number }) =>
        prisma.projectColumn.update({
          where: { id: BigInt(col.id) },
          data: { position: col.position },
        })
      )
    )

    // Return updated project
    const project = await prisma.project.findUnique({
      where: { id: BigInt(projectId) },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: {
              orderBy: { position: "asc" },
            },
          },
        },
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error reordering columns:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
