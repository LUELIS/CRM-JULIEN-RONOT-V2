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

    // Get dashboard stats for this client
    const [
      pendingInvoices,
      totalDueResult,
      pendingQuotes,
      recentInvoices,
      recentQuotes,
    ] = await Promise.all([
      // Count pending invoices (sent + overdue)
      prisma.invoice.count({
        where: {
          clientId,
          status: { in: ["sent", "overdue"] },
        },
      }),
      // Sum of pending invoices
      prisma.invoice.aggregate({
        where: {
          clientId,
          status: { in: ["sent", "overdue"] },
        },
        _sum: { totalTtc: true },
      }),
      // Count pending quotes
      prisma.quote.count({
        where: {
          clientId,
          status: "sent",
        },
      }),
      // Recent invoices (last 5)
      prisma.invoice.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          totalTtc: true,
          status: true,
          issueDate: true,
        },
      }),
      // Recent quotes (last 5)
      prisma.quote.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          totalTtc: true,
          status: true,
          issueDate: true,
        },
      }),
    ])

    return NextResponse.json({
      pendingInvoices,
      totalDue: Number(totalDueResult._sum.totalTtc || 0),
      pendingQuotes,
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id.toString(),
        invoiceNumber: inv.invoiceNumber,
        totalTtc: Number(inv.totalTtc),
        status: inv.status,
        issueDate: inv.issueDate?.toISOString(),
      })),
      recentQuotes: recentQuotes.map((quote) => ({
        id: quote.id.toString(),
        quoteNumber: quote.quoteNumber,
        totalTtc: Number(quote.totalTtc),
        status: quote.status,
        issueDate: quote.issueDate?.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching client dashboard:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du tableau de bord" },
      { status: 500 }
    )
  }
}
