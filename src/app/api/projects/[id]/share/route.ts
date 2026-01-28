import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

// GET - Get share status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        shareToken: true,
        shareEnabled: true,
        guests: {
          select: {
            id: true,
            email: true,
            name: true,
            lastSeenAt: true,
          },
          orderBy: { lastSeenAt: "desc" },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    return NextResponse.json({
      shareEnabled: project.shareEnabled,
      shareToken: project.shareToken,
      shareUrl: project.shareToken && project.shareEnabled
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/shared/project/${project.shareToken}`
        : null,
      guests: project.guests.map(g => ({
        id: g.id.toString(),
        email: g.email,
        name: g.name,
        lastSeenAt: g.lastSeenAt?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error("Error getting share status:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST - Enable/disable sharing or regenerate token
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body // "enable", "disable", "regenerate"

    const project = await prisma.project.findUnique({
      where: { id: BigInt(id) },
    })

    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    let shareToken = project.shareToken
    let shareEnabled = project.shareEnabled

    if (action === "enable") {
      // Generate token if doesn't exist
      if (!shareToken) {
        shareToken = randomBytes(32).toString("hex")
      }
      shareEnabled = true
    } else if (action === "disable") {
      shareEnabled = false
    } else if (action === "regenerate") {
      shareToken = randomBytes(32).toString("hex")
      shareEnabled = true
    }

    await prisma.project.update({
      where: { id: BigInt(id) },
      data: {
        shareToken,
        shareEnabled,
      },
    })

    return NextResponse.json({
      shareEnabled,
      shareToken,
      shareUrl: shareToken && shareEnabled
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/shared/project/${shareToken}`
        : null,
    })
  } catch (error) {
    console.error("Error updating share settings:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
