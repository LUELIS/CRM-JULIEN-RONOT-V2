import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST test connection to Dokploy server
export async function POST(
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

    // Test the connection
    const testResult = await testDokployConnection(server.url, server.apiToken)

    // Update server status
    await prisma.dokployServer.update({
      where: { id: BigInt(id) },
      data: {
        lastCheckAt: new Date(),
        lastStatus: testResult.success ? "connected" : "error",
      },
    })

    return NextResponse.json(testResult)
  } catch (error) {
    console.error("Error testing Dokploy connection:", error)
    return NextResponse.json(
      { error: "Erreur lors du test de connexion" },
      { status: 500 }
    )
  }
}

// Helper function to test Dokploy connection
async function testDokployConnection(
  url: string,
  token: string
): Promise<{
  success: boolean
  message: string
  projects?: number
  details?: {
    projectCount: number
    applicationCount: number
    databaseCount: number
  }
}> {
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

    // Count resources
    let applicationCount = 0
    let databaseCount = 0

    for (const project of projects) {
      applicationCount += project.applications?.length || 0
      databaseCount +=
        (project.postgres?.length || 0) +
        (project.mysql?.length || 0) +
        (project.mongo?.length || 0) +
        (project.redis?.length || 0) +
        (project.mariadb?.length || 0)
    }

    return {
      success: true,
      message: `Connexion réussie`,
      projects: projects.length,
      details: {
        projectCount: projects.length,
        applicationCount,
        databaseCount,
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Erreur de connexion: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
    }
  }
}
