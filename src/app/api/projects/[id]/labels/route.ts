import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

function serializeLabel(label: any) {
  return {
    ...label,
    id: label.id.toString(),
    projectId: label.projectId.toString(),
  }
}

// GET: List labels for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { id: projectId } = await params

    const labels = await prisma.projectLabel.findMany({
      where: { projectId: BigInt(projectId) },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(labels.map(serializeLabel))
  } catch (error) {
    console.error("Error fetching labels:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST: Create a new label
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
    const { name, color } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 })
    }

    const label = await prisma.projectLabel.create({
      data: {
        projectId: BigInt(projectId),
        name: name.trim(),
        color: color || "#6B7280",
      },
    })

    return NextResponse.json(serializeLabel(label), { status: 201 })
  } catch (error) {
    console.error("Error creating label:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
