import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("perPage") || "15")
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""

  try {
    const where: Prisma.QuoteWhereInput = {}

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search } },
        { client: { companyName: { contains: search } } },
        { client: { email: { contains: search } } },
      ]
    }

    if (status) {
      if (status === "converted") {
        where.invoiceId = { not: null }
      } else if (["draft", "sent", "accepted", "rejected", "expired"].includes(status)) {
        where.status = status as "draft" | "sent" | "accepted" | "rejected" | "expired"
        where.invoiceId = null
      }
    }

    const [quotes, total, stats, convertedCount] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: "desc" },
      }),
      prisma.quote.count({ where }),
      prisma.quote.groupBy({
        by: ["status"],
        where: { invoiceId: null },
        _count: true,
        _sum: { totalTtc: true },
      }),
      prisma.quote.aggregate({
        where: { invoiceId: { not: null } },
        _count: true,
        _sum: { totalTtc: true },
      }),
    ])

    // Calculate stats
    const statusCounts = stats.reduce(
      (acc, s) => {
        acc[s.status || "draft"] = {
          count: s._count,
          amount: Number(s._sum.totalTtc || 0),
        }
        return acc
      },
      {} as Record<string, { count: number; amount: number }>
    )

    const totalAmount = await prisma.quote.aggregate({
      _sum: { totalTtc: true },
    })

    const serializedQuotes = quotes.map((quote) => ({
      id: quote.id.toString(),
      quoteNumber: quote.quoteNumber,
      status: quote.invoiceId ? "converted" : (quote.status || "draft"),
      totalHt: Number(quote.subtotalHt || 0),
      totalTtc: Number(quote.totalTtc || 0),
      issueDate: quote.issueDate.toISOString(),
      validUntil: quote.validityDate.toISOString(),
      invoiceId: quote.invoiceId?.toString() || null,
      client: {
        id: quote.client.id.toString(),
        companyName: quote.client.companyName,
        email: quote.client.email,
      },
    }))

    return NextResponse.json({
      quotes: serializedQuotes,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
      stats: {
        total,
        draft: statusCounts.draft?.count || 0,
        sent: statusCounts.sent?.count || 0,
        accepted: statusCounts.accepted?.count || 0,
        rejected: statusCounts.rejected?.count || 0,
        expired: statusCounts.expired?.count || 0,
        converted: convertedCount._count || 0,
        totalAmount: Number(totalAmount._sum.totalTtc || 0),
        acceptedAmount: (statusCounts.accepted?.amount || 0) + Number(convertedCount._sum?.totalTtc || 0),
        pendingAmount: (statusCounts.sent?.amount || 0) + (statusCounts.draft?.amount || 0),
      },
    })
  } catch (error) {
    console.error("Error fetching quotes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des devis" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, issueDate, validUntil, notes, items, status } = body

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Client et lignes requises" },
        { status: 400 }
      )
    }

    // Generate quote number
    const lastQuote = await prisma.quote.findFirst({
      orderBy: { id: "desc" },
      select: { quoteNumber: true },
    })

    let nextNumber = 1
    if (lastQuote?.quoteNumber) {
      const match = lastQuote.quoteNumber.match(/(\d+)$/)
      if (match) nextNumber = parseInt(match[1]) + 1
    }

    const quoteNumber = `DEV-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`

    // Calculate totals
    let subtotalHt = 0
    let taxAmount = 0

    items.forEach((item: { quantity: number; unitPriceHt: number; vatRate: number }) => {
      const lineTotal = item.quantity * item.unitPriceHt
      subtotalHt += lineTotal
      taxAmount += lineTotal * (item.vatRate / 100)
    })

    const totalTtc = subtotalHt + taxAmount

    const quote = await prisma.quote.create({
      data: {
        tenant_id: BigInt(1),
        clientId: BigInt(clientId),
        quoteNumber,
        status: status || "draft",
        issueDate: new Date(issueDate),
        validityDate: new Date(validUntil),
        subtotalHt,
        taxAmount,
        totalTtc,
        notes,
        items: {
          create: items.map((item: {
            description: string
            quantity: number
            unit?: string
            unitPriceHt: number
            vatRate: number
            serviceId?: string
          }) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || "unité",
            unitPriceHt: item.unitPriceHt,
            vatRate: item.vatRate || 20,
            totalHt: item.quantity * item.unitPriceHt,
            totalTtc: item.quantity * item.unitPriceHt * (1 + item.vatRate / 100),
            serviceId: item.serviceId ? BigInt(item.serviceId) : null,
          })),
        },
      },
    })

    return NextResponse.json({
      id: quote.id.toString(),
      quoteNumber: quote.quoteNumber,
    })
  } catch (error) {
    console.error("Error creating quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du devis" },
      { status: 500 }
    )
  }
}
