import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { convertProspectToClient } from "@/lib/client-utils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    // Get user with clientId
    const user = await prisma.user.findUnique({
      where: { id: BigInt(session.user.id) },
      select: {
        clientId: true,
        role: true,
      },
    })

    if (!user?.clientId || user.role !== "client") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      )
    }

    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: {
        id: BigInt(id),
        clientId: user.clientId,
      },
      include: {
        client: {
          select: {
            companyName: true,
            email: true,
            phone: true,
            address: true,
            postalCode: true,
            city: true,
            country: true,
          },
        },
        items: {
          orderBy: { id: "asc" },
        },
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Devis non trouvé" },
        { status: 404 }
      )
    }

    // Update view count
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    })

    return NextResponse.json({
      id: quote.id.toString(),
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      issueDate: quote.issueDate?.toISOString(),
      validUntil: quote.validityDate?.toISOString(),
      acceptedAt: quote.signed_at?.toISOString(),
      subtotalHt: Number(quote.subtotalHt),
      taxAmount: Number(quote.taxAmount),
      totalTtc: Number(quote.totalTtc),
      notes: quote.notes,
      client: quote.client,
      items: quote.items.map((item) => ({
        id: item.id.toString(),
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPriceHt: Number(item.unitPriceHt),
        vatRate: Number(item.vatRate),
        totalHt: Number(item.totalHt),
        totalTtc: Number(item.totalTtc),
      })),
    })
  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du devis" },
      { status: 500 }
    )
  }
}

// Accept or reject quote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        clientId: true,
        role: true,
      },
    })

    if (!user?.clientId || user.role !== "client") {
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action non valide" },
        { status: 400 }
      )
    }

    const quote = await prisma.quote.findFirst({
      where: {
        id: BigInt(id),
        clientId: user.clientId,
        status: "sent",
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Devis non trouvé ou non modifiable" },
        { status: 404 }
      )
    }

    const updatedQuote = await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: action === "accept" ? "accepted" : "rejected",
        signed_at: action === "accept" ? new Date() : null,
        rejectedAt: action === "reject" ? new Date() : null,
      },
    })

    // Auto-convert prospect to client when quote is accepted
    if (action === "accept" && quote.clientId) {
      await convertProspectToClient(quote.clientId)
    }

    return NextResponse.json({
      success: true,
      status: updatedQuote.status,
    })
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du devis" },
      { status: 500 }
    )
  }
}
