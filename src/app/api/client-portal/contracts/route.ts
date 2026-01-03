import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - List contracts for the authenticated client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = session.user as any
    if (user.type !== "client" || !user.clientId) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "all"

    // Build where clause
    const where: any = {
      clientId: BigInt(user.clientId),
      status: { not: "draft" }, // Only show sent contracts
    }

    if (status !== "all") {
      where.status = status
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            pageCount: true,
          },
        },
        signers: {
          select: {
            id: true,
            name: true,
            email: true,
            signerType: true,
            status: true,
            signedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      contracts: contracts.map((c) => {
        const signedCount = c.signers.filter(
          (s) => s.status === "signed" || s.status === "validated"
        ).length
        const totalSigners = c.signers.filter(
          (s) => s.signerType === "signer" || s.signerType === "validator"
        ).length

        return {
          id: c.id.toString(),
          title: c.title,
          description: c.description,
          status: c.status,
          documentsCount: c.documents.length,
          signersCount: totalSigners,
          signedCount,
          createdAt: c.createdAt?.toISOString(),
          sentAt: c.sentAt?.toISOString(),
          completedAt: c.completedAt?.toISOString(),
          expiresAt: c.expiresAt?.toISOString(),
        }
      }),
    })
  } catch (error) {
    console.error("Error fetching client contracts:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des contrats" },
      { status: 500 }
    )
  }
}
