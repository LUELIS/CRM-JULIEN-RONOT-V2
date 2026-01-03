import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Get contract details for client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = session.user as any
    if (user.type !== "client" || !user.clientId) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 })
    }

    const { id } = await params

    const contract = await prisma.contract.findFirst({
      where: {
        id: BigInt(id),
        clientId: BigInt(user.clientId),
        status: { not: "draft" },
      },
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            pageCount: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        signers: {
          select: {
            id: true,
            name: true,
            email: true,
            signerType: true,
            status: true,
            viewedAt: true,
            signedAt: true,
            declinedAt: true,
            declineReason: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: "Contrat non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      contract: {
        id: contract.id.toString(),
        title: contract.title,
        description: contract.description,
        status: contract.status,
        expirationDays: contract.expirationDays,
        createdAt: contract.createdAt?.toISOString(),
        sentAt: contract.sentAt?.toISOString(),
        completedAt: contract.completedAt?.toISOString(),
        expiresAt: contract.expiresAt?.toISOString(),
        documents: contract.documents.map((d) => ({
          id: d.id.toString(),
          filename: d.filename,
          pageCount: d.pageCount,
        })),
        signers: contract.signers.map((s) => ({
          id: s.id.toString(),
          name: s.name,
          email: s.email,
          signerType: s.signerType,
          status: s.status,
          viewedAt: s.viewedAt?.toISOString(),
          signedAt: s.signedAt?.toISOString(),
          declinedAt: s.declinedAt?.toISOString(),
          declineReason: s.declineReason,
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching client contract:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du contrat" },
      { status: 500 }
    )
  }
}
