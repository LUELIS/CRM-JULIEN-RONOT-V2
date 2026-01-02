import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    })

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Si cette adresse existe, un email a été envoyé.",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex")

    // Set token expiry to 1 hour from now
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000)

    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: resetExpires,
      },
    })

    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.name)
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError)
      // Don't reveal email sending failure to prevent enumeration
    }

    return NextResponse.json({
      success: true,
      message: "Si cette adresse existe, un email a été envoyé.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 }
    )
  }
}
