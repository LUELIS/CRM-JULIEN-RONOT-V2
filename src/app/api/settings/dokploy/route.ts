import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET all Dokploy servers
export async function GET() {
  try {
    const servers = await prisma.dokployServer.findMany({
      where: { tenant_id: BigInt(1) },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(
      servers.map((server) => ({
        id: server.id.toString(),
        name: server.name,
        url: server.url,
        apiToken: server.apiToken ? "••••••••" : "", // Mask token for security
        isActive: server.isActive,
        lastCheckAt: server.lastCheckAt?.toISOString() || null,
        lastStatus: server.lastStatus,
        createdAt: server.createdAt.toISOString(),
      }))
    )
  } catch (error) {
    console.error("Error fetching Dokploy servers:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des serveurs" },
      { status: 500 }
    )
  }
}

// POST create new Dokploy server
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, url, apiToken, isActive = true } = body

    if (!name || !url || !apiToken) {
      return NextResponse.json(
        { error: "Nom, URL et token API sont requis" },
        { status: 400 }
      )
    }

    // Check for duplicates
    const existing = await prisma.dokployServer.findFirst({
      where: {
        tenant_id: BigInt(1),
        name: name,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Un serveur avec ce nom existe déjà" },
        { status: 400 }
      )
    }

    // Test connection before saving
    const testResult = await testDokployConnection(url, apiToken)

    const server = await prisma.dokployServer.create({
      data: {
        tenant_id: BigInt(1),
        name,
        url: url.replace(/\/$/, ""), // Remove trailing slash
        apiToken,
        isActive,
        lastCheckAt: new Date(),
        lastStatus: testResult.success ? "connected" : "error",
      },
    })

    return NextResponse.json({
      id: server.id.toString(),
      name: server.name,
      url: server.url,
      isActive: server.isActive,
      lastStatus: server.lastStatus,
      connectionTest: testResult,
    })
  } catch (error) {
    console.error("Error creating Dokploy server:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du serveur" },
      { status: 500 }
    )
  }
}

// Helper function to test Dokploy connection
async function testDokployConnection(
  url: string,
  token: string
): Promise<{ success: boolean; message: string; projects?: number }> {
  try {
    const response = await fetch(`${url}/api/trpc/project.all`, {
      method: "GET",
      headers: {
        "x-api-key": token,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        message: `Erreur ${response.status}: ${errorText.substring(0, 100)}`,
      }
    }

    const data = await response.json()
    const projects = data.result?.data?.json || []

    return {
      success: true,
      message: `Connexion réussie - ${projects.length} projet(s) trouvé(s)`,
      projects: projects.length,
    }
  } catch (error) {
    return {
      success: false,
      message: `Erreur de connexion: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
    }
  }
}
