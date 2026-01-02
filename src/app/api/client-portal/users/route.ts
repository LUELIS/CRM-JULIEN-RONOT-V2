import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { sendClientInvitationEmail } from "@/lib/email"

// GET - List users for the current client company
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Get user with client info
    const currentUser = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        clientId: true,
        role: true,
        isPrimaryUser: true,
      },
    })

    if (!currentUser?.clientId || currentUser.role !== "client") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      where: {
        clientId: currentUser.clientId,
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

    return NextResponse.json({
      users: mappedUsers,
      isPrimaryUser: currentUser.isPrimaryUser,
    })
  } catch (error) {
    console.error("Error fetching client users:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    )
  }
}

// POST - Invite a new user (primary user only)
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Get user with client info
    const currentUser = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        id: true,
        name: true,
        clientId: true,
        role: true,
        isPrimaryUser: true,
        client: {
          select: {
            companyName: true,
            tenant_id: true,
          },
        },
      },
    })

    if (!currentUser?.clientId || currentUser.role !== "client") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
    }

    if (!currentUser.isPrimaryUser) {
      return NextResponse.json(
        { error: "Seul l'utilisateur principal peut inviter des utilisateurs" },
        { status: 403 }
      )
    }

    const { name, email } = await request.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nom et email requis" },
        { status: 400 }
      )
    }

    // Check if email is already taken by another CLIENT user
    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        tenant_id: currentUser.client?.tenant_id,
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
        clientId: currentUser.clientId,
        tenant_id: currentUser.client?.tenant_id,
        isPrimaryUser: false,
        isActive: true,
        invitationToken,
        invitationExpires: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h
        invitedBy: currentUser.id,
      },
    })

    // Send invitation email
    try {
      await sendClientInvitationEmail(
        email,
        invitationToken,
        currentUser.name,
        currentUser.client?.companyName || "Votre entreprise"
      )
    } catch (emailError) {
      console.error("Error sending invitation email:", emailError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        status: "invited",
      },
    })
  } catch (error) {
    console.error("Error inviting client user:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'invitation" },
      { status: 500 }
    )
  }
}
