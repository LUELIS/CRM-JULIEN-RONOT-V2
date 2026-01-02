import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, quotes_status } from "@/generated/prisma/client"

export async function GET(request: NextRequest) {
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

    const clientId = user.clientId

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const perPage = parseInt(searchParams.get("perPage") || "10")
    const status = searchParams.get("status") || ""

    // Build where clause
    const where: Prisma.QuoteWhereInput = { clientId }

    if (status && status !== "all") {
      where.status = status as quotes_status
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          totalTtc: true,
          issueDate: true,
          validityDate: true,
        },
      }),
      prisma.quote.count({ where }),
    ])

    return NextResponse.json({
      quotes: quotes.map((quote) => ({
        id: quote.id.toString(),
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        totalTtc: Number(quote.totalTtc),
        issueDate: quote.issueDate?.toISOString(),
        validUntil: quote.validityDate?.toISOString(),
      })),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error("Error fetching client quotes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des devis" },
      { status: 500 }
    )
  }
}
