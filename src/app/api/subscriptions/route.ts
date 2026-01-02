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
    const where: Prisma.SubscriptionWhereInput = {}

    if (search) {
      where.OR = [
        { subscriptionNumber: { contains: search } },
        { name: { contains: search } },
        { client: { companyName: { contains: search } } },
      ]
    }

    if (status && ["active", "paused", "cancelled", "expired"].includes(status)) {
      where.status = status as "active" | "paused" | "cancelled" | "expired"
    }

    const [subscriptions, total, stats] = await Promise.all([
      prisma.subscription.findMany({
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
      prisma.subscription.count({ where }),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amountTtc: true },
      }),
    ])

    // Calculate stats
    const statusCounts = stats.reduce(
      (acc, s) => {
        acc[s.status] = {
          count: s._count,
          amount: Number(s._sum.amountTtc || 0),
        }
        return acc
      },
      {} as Record<string, { count: number; amount: number }>
    )

    const totalMRR = await prisma.subscription.aggregate({
      where: { status: "active", billingCycle: "monthly" },
      _sum: { amountTtc: true },
    })

    const serializedSubscriptions = subscriptions.map((sub) => ({
      id: sub.id.toString(),
      subscriptionNumber: sub.subscriptionNumber,
      name: sub.name,
      description: sub.description,
      status: sub.status,
      billingCycle: sub.billingCycle,
      startDate: sub.startDate.toISOString(),
      nextBillingDate: sub.nextBillingDate.toISOString(),
      endDate: sub.endDate?.toISOString() || null,
      amountHt: Number(sub.amountHt || 0),
      amountTtc: Number(sub.amountTtc || 0),
      taxRate: Number(sub.taxRate || 20),
      autoInvoice: sub.autoInvoice,
      autoSend: sub.autoSend,
      totalInvoicesGenerated: sub.totalInvoicesGenerated,
      client: {
        id: sub.client.id.toString(),
        companyName: sub.client.companyName,
        email: sub.client.email,
      },
    }))

    return NextResponse.json({
      subscriptions: serializedSubscriptions,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
      stats: {
        total,
        active: statusCounts.active?.count || 0,
        paused: statusCounts.paused?.count || 0,
        cancelled: statusCounts.cancelled?.count || 0,
        expired: statusCounts.expired?.count || 0,
        activeAmount: statusCounts.active?.amount || 0,
        mrr: Number(totalMRR._sum.amountTtc || 0),
      },
    })
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des abonnements" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clientId,
      name,
      description,
      billingCycle,
      customDays,
      startDate,
      endDate,
      taxRate,
      autoInvoice,
      autoSend,
      invoiceDaysBefore,
      notes,
      items,
    } = body

    if (!clientId || !name || !billingCycle || !startDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Client, nom, cycle de facturation, date de début et lignes requises" },
        { status: 400 }
      )
    }

    // Generate subscription number
    const lastSub = await prisma.subscription.findFirst({
      orderBy: { id: "desc" },
      select: { subscriptionNumber: true },
    })

    let nextNumber = 1
    if (lastSub?.subscriptionNumber) {
      const match = lastSub.subscriptionNumber.match(/(\d+)$/)
      if (match) nextNumber = parseInt(match[1]) + 1
    }

    const subscriptionNumber = `ABO-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`

    // Calculate totals
    let amountHt = 0
    items.forEach((item: { quantity: number; unitPriceHt: number }) => {
      amountHt += item.quantity * item.unitPriceHt
    })
    const amountTtc = amountHt * (1 + (taxRate || 20) / 100)

    // Calculate next billing date based on cycle
    const start = new Date(startDate)
    let nextBillingDate = new Date(start)

    switch (billingCycle) {
      case "monthly":
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
        break
      case "quarterly":
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
        break
      case "biannual":
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 6)
        break
      case "yearly":
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
        break
      case "custom":
        nextBillingDate.setDate(nextBillingDate.getDate() + (customDays || 30))
        break
    }

    const subscription = await prisma.subscription.create({
      data: {
        tenant_id: BigInt(1),
        clientId: BigInt(clientId),
        subscriptionNumber,
        name,
        description: description || null,
        billingCycle,
        customDays: billingCycle === "custom" ? customDays : null,
        startDate: start,
        nextBillingDate,
        endDate: endDate ? new Date(endDate) : null,
        amountHt,
        taxRate: taxRate || 20,
        amountTtc,
        status: "active",
        autoInvoice: autoInvoice !== false,
        autoSend: autoSend || false,
        invoiceDaysBefore: invoiceDaysBefore || 0,
        notes,
        items: {
          create: items.map((item: {
            description: string
            quantity: number
            unit?: string
            unitPriceHt: number
            taxRate?: number
            serviceId?: string
          }) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || "unité",
            unitPriceHt: item.unitPriceHt,
            tax_rate: item.taxRate || taxRate || 20,
            total_ht: item.quantity * item.unitPriceHt,
            total_ttc: item.quantity * item.unitPriceHt * (1 + (item.taxRate || taxRate || 20) / 100),
            serviceId: item.serviceId ? BigInt(item.serviceId) : null,
          })),
        },
      },
    })

    return NextResponse.json({
      id: subscription.id.toString(),
      subscriptionNumber: subscription.subscriptionNumber,
    })
  } catch (error) {
    console.error("Error creating subscription:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'abonnement" },
      { status: 500 }
    )
  }
}
