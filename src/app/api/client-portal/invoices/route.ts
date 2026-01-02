import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const where: { clientId: bigint; status?: string | { in: string[] } } = { clientId }

    if (status && status !== "all") {
      if (status === "pending") {
        where.status = { in: ["sent", "overdue"] }
      } else {
        where.status = status
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalTtc: true,
          issueDate: true,
          dueDate: true,
          paymentDate: true,
        },
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: inv.id.toString(),
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        totalTtc: Number(inv.totalTtc),
        issueDate: inv.issueDate?.toISOString(),
        dueDate: inv.dueDate?.toISOString(),
        paymentDate: inv.paymentDate?.toISOString(),
      })),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error("Error fetching client invoices:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des factures" },
      { status: 500 }
    )
  }
}
