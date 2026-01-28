import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

// POST - Invite an email to the project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { email } = body

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 })
    }

    const project = await prisma.project.findUnique({
      where: { id: BigInt(id) },
    })

    if (!project) {
      return NextResponse.json({ error: "Projet non trouve" }, { status: 404 })
    }

    // Check if already invited
    const existingGuest = await prisma.projectGuest.findFirst({
      where: {
        projectId: project.id,
        email: email.toLowerCase(),
      },
    })

    if (existingGuest) {
      return NextResponse.json({ error: "Cet email est deja invite" }, { status: 400 })
    }

    // Create guest invitation (with token but no lastSeenAt = not yet connected)
    const token = randomBytes(32).toString("hex")
    const guest = await prisma.projectGuest.create({
      data: {
        projectId: project.id,
        email: email.toLowerCase(),
        token,
      },
    })

    return NextResponse.json({
      id: guest.id.toString(),
      email: guest.email,
      name: guest.name,
      lastSeenAt: null,
    })
  } catch (error) {
    console.error("Error inviting email:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
