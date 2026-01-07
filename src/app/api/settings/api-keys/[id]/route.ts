import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_TENANT_ID = BigInt(1)

// DELETE /api/settings/api-keys/:id - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params

    // Verify the key belongs to the tenant
    const apiKey = await prisma.externalApiKey.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: DEFAULT_TENANT_ID,
      },
    })

    if (!apiKey) {
      return NextResponse.json({ error: "Clé API non trouvée" }, { status: 404 })
    }

    await prisma.externalApiKey.delete({
      where: { id: apiKey.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting API key:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la clé API" },
      { status: 500 }
    )
  }
}

// PATCH /api/settings/api-keys/:id - Update API key (enable/disable)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify the key belongs to the tenant
    const apiKey = await prisma.externalApiKey.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: DEFAULT_TENANT_ID,
      },
    })

    if (!apiKey) {
      return NextResponse.json({ error: "Clé API non trouvée" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }

    if (body.name !== undefined) {
      updateData.name = body.name
    }

    if (body.description !== undefined) {
      updateData.description = body.description
    }

    if (body.rateLimit !== undefined) {
      updateData.rateLimit = body.rateLimit
    }

    const updated = await prisma.externalApiKey.update({
      where: { id: apiKey.id },
      data: updateData,
    })

    return NextResponse.json({
      id: updated.id.toString(),
      name: updated.name,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt?.toISOString(),
    })
  } catch (error) {
    console.error("Error updating API key:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la clé API" },
      { status: 500 }
    )
  }
}
