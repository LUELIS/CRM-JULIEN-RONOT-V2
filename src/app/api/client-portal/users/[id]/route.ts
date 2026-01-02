import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT - Update user (activate/deactivate)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const targetUserId = BigInt(id)

    // Get current user with client info
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

    if (!currentUser.isPrimaryUser) {
      return NextResponse.json(
        { error: "Seul l'utilisateur principal peut modifier les utilisateurs" },
        { status: 403 }
      )
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        clientId: true,
        isPrimaryUser: true,
      },
    })

    if (!targetUser || targetUser.clientId !== currentUser.clientId) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Cannot modify primary user
    if (targetUser.isPrimaryUser) {
      return NextResponse.json(
        { error: "Impossible de modifier l'utilisateur principal" },
        { status: 400 }
      )
    }

    const { isActive } = await request.json()

    await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating client user:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}

// DELETE - Remove user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const targetUserId = BigInt(id)

    // Get current user with client info
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

    if (!currentUser.isPrimaryUser) {
      return NextResponse.json(
        { error: "Seul l'utilisateur principal peut supprimer des utilisateurs" },
        { status: 403 }
      )
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        clientId: true,
        isPrimaryUser: true,
      },
    })

    if (!targetUser || targetUser.clientId !== currentUser.clientId) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Cannot delete primary user
    if (targetUser.isPrimaryUser) {
      return NextResponse.json(
        { error: "Impossible de supprimer l'utilisateur principal" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client user:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
