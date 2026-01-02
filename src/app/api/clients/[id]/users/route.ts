import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { sendClientInvitationEmail } from "@/lib/email"

// GET - List users for a client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const clientId = BigInt(id)

    const users = await prisma.user.findMany({
      where: {
        clientId,
        role: "client",
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isPrimaryUser: true,
        lastLoginAt: true,
        createdAt: true,
        invitationToken: true,
        invitationExpires: true,
      },
      orderBy: [
        { isPrimaryUser: "desc" },
        { createdAt: "asc" },
      ],
    })

    // Map users with status
    const mappedUsers = users.map((user) => {
      let status: "active" | "inactive" | "invited" = "active"
      if (!user.isActive) {
        status = "inactive"
      } else if (user.invitationToken && user.invitationExpires && user.invitationExpires > new Date()) {
        status = "invited"
      }

      return {
        id: String(user.id),
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        isPrimaryUser: user.isPrimaryUser,
        lastLoginAt: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt?.toISOString() || null,
        status,
      }
    })

    return NextResponse.json({ users: mappedUsers })
  } catch (error) {
    console.error("Error fetching client users:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    )
  }
}

// POST - Create primary user for a client (admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Only admins can create primary users
    const adminRoles = ["super_admin", "tenant_owner", "tenant_admin"]
    if (!adminRoles.includes(session.user.type)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    const { id } = await params
    const clientId = BigInt(id)
    const body = await request.json()

    const { name, email, sendInvitation } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nom et email requis" },
        { status: 400 }
      )
    }

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        tenant_id: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: "Client non trouvé" },
        { status: 404 }
      )
    }

    // Check if a primary user already exists
    const existingPrimary = await prisma.user.findFirst({
      where: {
        clientId,
        isPrimaryUser: true,
      },
    })

    if (existingPrimary) {
      return NextResponse.json(
        { error: "Un utilisateur principal existe déjà pour ce client" },
        { status: 400 }
      )
    }

    // Check if email is already taken by another CLIENT user (admins can share email)
    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        tenant_id: client.tenant_id,
        role: "client", // Only check client users, not admins
      },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé par un autre client" },
        { status: 400 }
      )
    }

    // Generate invitation token and temporary password
    const invitationToken = crypto.randomBytes(32).toString("hex")
    const tempPassword = crypto.randomBytes(16).toString("hex")
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    // Create the user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "client",
        clientId,
        tenant_id: client.tenant_id,
        isPrimaryUser: true,
        isActive: true,
        invitationToken: sendInvitation ? invitationToken : null,
        invitationExpires: sendInvitation ? new Date(Date.now() + 72 * 60 * 60 * 1000) : null, // 72h
        invitedBy: BigInt(session.user.id),
      },
    })

    // Send invitation email if requested
    if (sendInvitation) {
      try {
        await sendClientInvitationEmail(
          email,
          invitationToken,
          session.user.name || "L'administrateur",
          client.companyName
        )
      } catch (emailError) {
        console.error("Error sending invitation email:", emailError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        isPrimaryUser: user.isPrimaryUser,
        status: sendInvitation ? "invited" : "active",
      },
      invitationSent: sendInvitation,
    })
  } catch (error) {
    console.error("Error creating client user:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur" },
      { status: 500 }
    )
  }
}
