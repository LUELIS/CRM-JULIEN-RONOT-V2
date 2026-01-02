import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      slackUserId: user.slackUserId || null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existingUser = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Check if email is taken by another user
    if (body.email && body.email !== existingUser.email) {
      const emailTaken = await prisma.user.findFirst({
        where: {
          email: body.email,
          tenant_id: BigInt(1),
          NOT: { id: BigInt(id) },
        },
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé" },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {
      name: body.name || existingUser.name,
      email: body.email || existingUser.email,
      role: body.role || existingUser.role,
      isActive: body.isActive !== undefined ? body.isActive : existingUser.isActive,
      slackUserId: body.slackUserId !== undefined ? (body.slackUserId || null) : existingUser.slackUserId,
      updatedAt: new Date(),
    }

    // Update password if provided
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10)
    }

    const user = await prisma.user.update({
      where: { id: BigInt(id) },
      data: updateData,
    })

    return NextResponse.json({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      slackUserId: user.slackUserId || null,
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Check if user has tickets assigned
    const assignedTickets = await prisma.ticket.count({
      where: { assignedTo: BigInt(id) },
    })

    if (assignedTickets > 0) {
      // Soft delete - deactivate instead of delete
      await prisma.user.update({
        where: { id: BigInt(id) },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        softDeleted: true,
        message: "Utilisateur désactivé (tickets assignés)",
      })
    }

    await prisma.user.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    )
  }
}
