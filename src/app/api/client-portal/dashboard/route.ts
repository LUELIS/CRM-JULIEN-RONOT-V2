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
      upcomingDebits,
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
      // Recent invoices (last 5) - use id DESC to ensure newest first even with NULL created_at
      prisma.invoice.findMany({
        where: { clientId },
        orderBy: { id: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          totalTtc: true,
          total_ttc_after_discount: true,
          status: true,
          issueDate: true,
          debit_date: true,
          paymentMethod: true,
        },
      }),
      // Recent quotes (last 5) - use id DESC to ensure newest first
      prisma.quote.findMany({
        where: { clientId },
        orderBy: { id: "desc" },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          totalTtc: true,
          status: true,
          issueDate: true,
        },
      }),
      // All upcoming invoices to be debited (unpaid with debit payment method)
      prisma.invoice.findMany({
        where: {
          clientId,
          status: { in: ["sent", "overdue"] },
          OR: [
            { debit_date: { not: null } },
            { paymentMethod: { in: ["debit", "direct_debit", "prelevement_sepa"] } },
          ],
        },
        orderBy: { debit_date: "asc" },
        select: {
          id: true,
          invoiceNumber: true,
          totalTtc: true,
          total_ttc_after_discount: true,
          debit_date: true,
          dueDate: true,
          paymentMethod: true,
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
        totalTtc: Number(inv.total_ttc_after_discount) > 0
          ? Number(inv.total_ttc_after_discount)
          : Number(inv.totalTtc),
        status: inv.status,
        issueDate: inv.issueDate?.toISOString(),
        debitDate: inv.debit_date?.toISOString(),
        paymentMethod: inv.paymentMethod,
      })),
      recentQuotes: recentQuotes.map((quote) => ({
        id: quote.id.toString(),
        quoteNumber: quote.quoteNumber,
        totalTtc: Number(quote.totalTtc),
        status: quote.status,
        issueDate: quote.issueDate?.toISOString(),
      })),
      upcomingDebits: upcomingDebits.map((inv) => ({
        id: inv.id.toString(),
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.total_ttc_after_discount) > 0
          ? Number(inv.total_ttc_after_discount)
          : Number(inv.totalTtc),
        debitDate: inv.debit_date?.toISOString() || inv.dueDate?.toISOString(),
        paymentMethod: inv.paymentMethod,
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
