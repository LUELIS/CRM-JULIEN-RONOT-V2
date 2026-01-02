import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const daysAhead = parseInt(searchParams.get("days") || "30")

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    // Get domains expiring soon with their clients
    const domains = await prisma.domain.findMany({
      where: {
        tenant_id: BigInt(1),
        expirationDate: {
          lte: futureDate,
          gte: new Date(), // Not already expired
        },
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            contactEmail: true,
          },
        },
      },
      orderBy: {
        expirationDate: "asc",
      },
    })

    // Get expired domains
    const expiredDomains = await prisma.domain.findMany({
      where: {
        tenant_id: BigInt(1),
        expirationDate: {
          lt: new Date(),
        },
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            contactEmail: true,
          },
        },
      },
      orderBy: {
        expirationDate: "asc",
      },
    })

    const DEFAULT_RENEWAL_PRICE = 15 // Default renewal price in euros
    const serializeDomain = (domain: typeof domains[0]) => ({
      id: domain.id.toString(),
      domain: domain.domain,
      expirationDate: domain.expirationDate?.toISOString() || null,
      autoRenew: domain.autoRenew,
      renewalPrice: DEFAULT_RENEWAL_PRICE,
      daysUntilExpiration: domain.expirationDate
        ? Math.ceil(
            (domain.expirationDate.getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
      client: domain.client
        ? {
            id: domain.client.id.toString(),
            companyName: domain.client.companyName,
            email: domain.client.contactEmail || domain.client.email,
          }
        : null,
    })

    return NextResponse.json({
      expiringSoon: domains.map(serializeDomain),
      expired: expiredDomains.map(serializeDomain),
      stats: {
        totalExpiringSoon: domains.length,
        totalExpired: expiredDomains.length,
        totalRenewalValue: domains.length * DEFAULT_RENEWAL_PRICE,
      },
    })
  } catch (error) {
    console.error("Error fetching renewal alerts:", error)
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des alertes" },
      { status: 500 }
    )
  }
}
