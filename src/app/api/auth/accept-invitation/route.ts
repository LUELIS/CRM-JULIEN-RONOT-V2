import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET - Verify invitation token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token manquant" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        invitationToken: token,
        invitationExpires: {
          gt: new Date(),
        },
      },
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { valid: false, error: "Invitation invalide ou expirée" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      user: {
        name: user.name,
        email: user.email,
        companyName: user.client?.companyName || "Votre entreprise",
      },
    })
  } catch (error) {
    console.error("Error verifying invitation:", error)
    return NextResponse.json(
      { valid: false, error: "Erreur lors de la vérification" },
      { status: 500 }
    )
  }
}

// POST - Accept invitation and set password
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token et mot de passe requis" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      )
    }

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        invitationToken: token,
        invitationExpires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Invitation invalide ou expirée" },
        { status: 400 }
      )
    }

    // Hash password and update user
    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        invitationToken: null,
        invitationExpires: null,
        emailVerifiedAt: new Date(),
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Compte activé avec succès",
    })
  } catch (error) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'activation du compte" },
      { status: 500 }
    )
  }
}
