import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clientId: true,
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
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
      type: user.role,
      clientId: user.clientId?.toString() || null,
      clientName: user.client?.companyName || null,
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    )
  }
}
