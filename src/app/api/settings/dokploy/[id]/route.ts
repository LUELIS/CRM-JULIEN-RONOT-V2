import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET single Dokploy server
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const server = await prisma.dokployServer.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: BigInt(1),
      },
    })

    if (!server) {
      return NextResponse.json(
        { error: "Serveur non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: server.id.toString(),
      name: server.name,
      url: server.url,
      apiToken: server.apiToken, // Full token for editing
      isActive: server.isActive,
      lastCheckAt: server.lastCheckAt?.toISOString() || null,
      lastStatus: server.lastStatus,
      createdAt: server.createdAt.toISOString(),
    })
  } catch (error) {
    console.error("Error fetching Dokploy server:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du serveur" },
      { status: 500 }
    )
  }
}

// PUT update Dokploy server
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { name, url, apiToken, isActive } = body

    const existing = await prisma.dokployServer.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: BigInt(1),
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Serveur non trouvé" },
        { status: 404 }
      )
    }

    // Check for name duplicates (excluding current)
    if (name && name !== existing.name) {
      const duplicate = await prisma.dokployServer.findFirst({
        where: {
          tenant_id: BigInt(1),
          name: name,
          id: { not: BigInt(id) },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: "Un serveur avec ce nom existe déjà" },
          { status: 400 }
        )
      }
    }

    // Test connection if URL or token changed
    let lastStatus = existing.lastStatus
    let lastCheckAt = existing.lastCheckAt

    const newUrl = url || existing.url
    const newToken = apiToken || existing.apiToken

    if (url !== existing.url || (apiToken && apiToken !== existing.apiToken)) {
      const testResult = await testDokployConnection(newUrl, newToken)
      lastStatus = testResult.success ? "connected" : "error"
      lastCheckAt = new Date()
    }

    const server = await prisma.dokployServer.update({
      where: { id: BigInt(id) },
      data: {
        name: name || existing.name,
        url: newUrl.replace(/\/$/, ""),
        apiToken: apiToken || existing.apiToken,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        lastStatus,
        lastCheckAt,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: server.id.toString(),
      name: server.name,
      url: server.url,
      isActive: server.isActive,
      lastStatus: server.lastStatus,
      lastCheckAt: server.lastCheckAt?.toISOString() || null,
    })
  } catch (error) {
    console.error("Error updating Dokploy server:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du serveur" },
      { status: 500 }
    )
  }
}

// DELETE Dokploy server
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.dokployServer.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: BigInt(1),
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Serveur non trouvé" },
        { status: 404 }
      )
    }

    await prisma.dokployServer.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting Dokploy server:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du serveur" },
      { status: 500 }
    )
  }
}

// Helper function to test Dokploy connection
async function testDokployConnection(
  url: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${url}/api/trpc/project.all`, {
      method: "GET",
      headers: {
        "x-api-key": token,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return {
        success: false,
        message: `Erreur ${response.status}`,
      }
    }

    return {
      success: true,
      message: "Connexion réussie",
    }
  } catch (error) {
    return {
      success: false,
      message: `Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
    }
  }
}
