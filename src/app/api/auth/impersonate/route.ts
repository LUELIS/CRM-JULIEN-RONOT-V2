import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Start impersonation
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Only admins can impersonate
    const adminRoles = ["super_admin", "tenant_owner", "tenant_admin"]
    if (!adminRoles.includes(session.user.type)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
    }

    // Already impersonating
    if (session.user.isImpersonating) {
      return NextResponse.json(
        { error: "Vous êtes déjà en mode impersonation" },
        { status: 400 }
      )
    }

    const { clientId } = await request.json()

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId requis" },
        { status: 400 }
      )
    }

    // Find the primary user for this client
    const clientUser = await prisma.user.findFirst({
      where: {
        clientId: BigInt(clientId),
        isPrimaryUser: true,
        isActive: true,
      },
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
      },
    })

    // If no primary user, find any client user
    const targetUser = clientUser || await prisma.user.findFirst({
      where: {
        clientId: BigInt(clientId),
        role: "client",
        isActive: true,
      },
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: "Aucun utilisateur client trouvé pour ce client" },
        { status: 404 }
      )
    }

    // Return impersonation data to be used with session update
    return NextResponse.json({
      success: true,
      impersonate: {
        userId: String(targetUser.id),
        clientId: String(targetUser.clientId),
        userName: targetUser.name,
        clientName: targetUser.client?.companyName || "Client",
        isPrimaryUser: targetUser.isPrimaryUser,
      },
    })
  } catch (error) {
    console.error("Impersonate error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'impersonation" },
      { status: 500 }
    )
  }
}

// DELETE - End impersonation
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    if (!session.user.isImpersonating) {
      return NextResponse.json(
        { error: "Vous n'êtes pas en mode impersonation" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      endImpersonation: true,
    })
  } catch (error) {
    console.error("End impersonate error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la fin d'impersonation" },
      { status: 500 }
    )
  }
}
