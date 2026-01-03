import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET - List all tags
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const tenantId = BigInt(1)

    const tags = await prisma.noteTagDefinition.findMany({
      where: { tenant_id: tenantId },
      include: {
        notes: {
          include: {
            note: {
              select: { id: true, isRecycle: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({
      tags: tags.map((tag) => ({
        id: tag.id.toString(),
        name: tag.name,
        color: tag.color,
        icon: tag.icon,
        parentId: tag.parentId?.toString() || null,
        noteCount: tag.notes.filter((n) => !n.note.isRecycle).length,
        createdAt: tag.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des tags" },
      { status: 500 }
    )
  }
}

// POST - Create a new tag
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const tenantId = BigInt(1)

    // Check if tag already exists
    const existing = await prisma.noteTagDefinition.findFirst({
      where: {
        tenant_id: tenantId,
        name: body.name,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Un tag avec ce nom existe déjà" },
        { status: 400 }
      )
    }

    const tag = await prisma.noteTagDefinition.create({
      data: {
        tenant_id: tenantId,
        name: body.name,
        color: body.color || "#0064FA",
        icon: body.icon || null,
        parentId: body.parentId ? BigInt(body.parentId) : null,
      },
    })

    return NextResponse.json({
      id: tag.id.toString(),
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      parentId: tag.parentId?.toString() || null,
      noteCount: 0,
      createdAt: tag.createdAt.toISOString(),
    })
  } catch (error) {
    console.error("Error creating tag:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du tag" },
      { status: 500 }
    )
  }
}
