import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

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

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
        isActive: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré. Veuillez refaire une demande." },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Mot de passe mis à jour avec succès",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    )
  }
}

// GET to verify token validity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token manquant" },
        { status: 400 }
      )
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
        isActive: true,
      },
      select: {
        email: true,
        name: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        valid: false,
        error: "Lien invalide ou expiré",
      })
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
      name: user.name,
    })
  } catch (error) {
    console.error("Verify token error:", error)
    return NextResponse.json(
      { valid: false, error: "Une erreur est survenue" },
      { status: 500 }
    )
  }
}
