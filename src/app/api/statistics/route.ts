import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const period = searchParams.get("period") || "year"

  try {
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date
    let previousEndDate: Date

    switch (period) {
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        previousStartDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1)
        previousEndDate = new Date(now.getFullYear(), quarter * 3, 0)
        break
      default: // year
        startDate = new Date(now.getFullYear(), 0, 1)
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31)
    }

    // Revenue calculation
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        tenant_id: BigInt(1),
        status: "paid",
        paymentDate: { gte: startDate },
      },
    })

    const totalRevenue = paidInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalTtc),
      0
    )

    // Previous period revenue
    const previousPaidInvoices = await prisma.invoice.findMany({
      where: {
        tenant_id: BigInt(1),
        status: "paid",
        paymentDate: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
    })

    const previousRevenue = previousPaidInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalTtc),
      0
    )

    const revenueGrowth =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0

    // This month revenue
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const thisMonthInvoices = await prisma.invoice.findMany({
      where: {
        tenant_id: BigInt(1),
        status: "paid",
        paymentDate: { gte: thisMonthStart },
      },
    })

    const lastMonthInvoices = await prisma.invoice.findMany({
      where: {
        tenant_id: BigInt(1),
        status: "paid",
        paymentDate: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    })

    const thisMonthRevenue = thisMonthInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalTtc),
      0
    )
    const lastMonthRevenue = lastMonthInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalTtc),
      0
    )

    // Invoice stats
    const invoiceStats = await prisma.invoice.groupBy({
      by: ["status"],
      where: { tenant_id: BigInt(1) },
      _count: true,
    })

    const invoiceCounts = {
      total: invoiceStats.reduce((sum, s) => sum + s._count, 0),
      paid: invoiceStats.find((s) => s.status === "paid")?._count || 0,
      pending: invoiceStats.find((s) => s.status === "sent")?._count || 0,
      overdue: 0,
      draft: invoiceStats.find((s) => s.status === "draft")?._count || 0,
    }

    // Count overdue (sent invoices past due date)
    const overdueCount = await prisma.invoice.count({
      where: {
        tenant_id: BigInt(1),
        status: "sent",
        dueDate: { lt: now },
      },
    })
    invoiceCounts.overdue = overdueCount
    invoiceCounts.pending -= overdueCount

    // Quote stats
    const quoteStats = await prisma.quote.groupBy({
      by: ["status"],
      where: { tenant_id: BigInt(1) },
      _count: true,
    })

    const quoteCounts = {
      total: quoteStats.reduce((sum, s) => sum + s._count, 0),
      accepted: quoteStats.find((s) => s.status === "accepted")?._count || 0,
      rejected: quoteStats.find((s) => s.status === "rejected")?._count || 0,
      pending: quoteStats.find((s) => s.status === "sent")?._count || 0,
    }

    const conversionRate =
      quoteCounts.total > 0
        ? (quoteCounts.accepted / quoteCounts.total) * 100
        : 0

    // Client stats
    const clientStats = await prisma.client.groupBy({
      by: ["status"],
      where: { tenant_id: BigInt(1) },
      _count: true,
    })

    const clientCounts = {
      total: clientStats.reduce((sum, s) => sum + s._count, 0),
      active: clientStats.find((s) => s.status === "active")?._count || 0,
      prospects: clientStats.find((s) => s.status === "prospect")?._count || 0,
      newThisMonth: 0,
    }

    const newClientsThisMonth = await prisma.client.count({
      where: {
        tenant_id: BigInt(1),
        createdAt: { gte: thisMonthStart },
      },
    })
    clientCounts.newThisMonth = newClientsThisMonth

    // MRR calculation
    const clientsWithRecurring = await prisma.client.findMany({
      where: {
        tenant_id: BigInt(1),
        status: "active",
        services: {
          some: {
            is_active: true,
            service: { isRecurring: true },
          },
        },
      },
      include: {
        services: {
          where: {
            is_active: true,
            service: { isRecurring: true },
          },
          include: { service: true },
        },
      },
    })

    let mrr = 0
    for (const client of clientsWithRecurring) {
      for (const cs of client.services) {
        const price = cs.custom_price_ht
          ? Number(cs.custom_price_ht)
          : Number(cs.service.unitPriceHt)
        const quantity = Number(cs.quantity)
        mrr += price * quantity * (1 + Number(cs.service.vatRate) / 100)
      }
    }

    // Top clients
    const topClientsRaw = await prisma.client.findMany({
      where: { tenant_id: BigInt(1) },
      include: {
        invoices: {
          where: { status: "paid" },
          select: { totalTtc: true },
        },
        _count: {
          select: { invoices: true },
        },
      },
      orderBy: { companyName: "asc" },
    })

    const topClients = topClientsRaw
      .map((client) => ({
        id: client.id.toString(),
        name: client.companyName,
        revenue: client.invoices.reduce((sum, inv) => sum + Number(inv.totalTtc), 0),
        invoiceCount: client._count.invoices,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Monthly revenue (last 6 months)
    const monthlyRevenue: { month: string; revenue: number; invoiceCount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthName = monthStart.toLocaleDateString("fr-FR", { month: "short" })

      const monthInvoices = await prisma.invoice.findMany({
        where: {
          tenant_id: BigInt(1),
          status: "paid",
          paymentDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      })

      monthlyRevenue.push({
        month: monthName,
        revenue: monthInvoices.reduce((sum, inv) => sum + Number(inv.totalTtc), 0),
        invoiceCount: monthInvoices.length,
      })
    }

    // Revenue by service
    const serviceRevenue = await prisma.invoiceItem.groupBy({
      by: ["description"],
      where: {
        invoice: {
          tenant_id: BigInt(1),
          status: "paid",
        },
      },
      _sum: { totalTtc: true },
    })

    const totalServiceRevenue = serviceRevenue.reduce(
      (sum, s) => sum + Number(s._sum.totalTtc || 0),
      0
    )

    const revenueByService = serviceRevenue
      .map((s) => ({
        name: s.description || "Autre",
        revenue: Number(s._sum.totalTtc || 0),
        percentage:
          totalServiceRevenue > 0
            ? (Number(s._sum.totalTtc || 0) / totalServiceRevenue) * 100
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: revenueGrowth,
      },
      invoices: invoiceCounts,
      quotes: {
        ...quoteCounts,
        conversionRate,
      },
      clients: clientCounts,
      mrr: {
        current: mrr,
        growth: 0,
        arr: mrr * 12,
      },
      topClients,
      monthlyRevenue,
      revenueByService,
    })
  } catch (error) {
    console.error("Error fetching statistics:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
