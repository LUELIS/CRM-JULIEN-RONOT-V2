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

// PUT: Update a label
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { labelId } = await params
    const body = await request.json()
    const { name, color } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (color !== undefined) updateData.color = color

    const label = await prisma.projectLabel.update({
      where: { id: BigInt(labelId) },
      data: updateData,
    })

    return NextResponse.json(serializeLabel(label))
  } catch (error) {
    console.error("Error updating label:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE: Delete a label
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 })
    }

    const { labelId } = await params

    await prisma.projectLabel.delete({
      where: { id: BigInt(labelId) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting label:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
