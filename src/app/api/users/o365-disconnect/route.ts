import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST: Disconnect user's O365 calendar
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: BigInt(session.user.id) },
      data: {
        o365AccessToken: null,
        o365RefreshToken: null,
        o365TokenExpiresAt: null,
        o365ConnectedEmail: null,
        o365ConnectedAt: null,
      },
    })

    return NextResponse.json({ success: true, message: "Calendrier O365 déconnecté" })
  } catch (error) {
    console.error("User O365 disconnect error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la déconnexion" },
      { status: 500 }
    )
  }
}
