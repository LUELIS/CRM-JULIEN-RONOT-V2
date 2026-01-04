import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const clientId = searchParams.get("clientId") || ""
    const expiringDays = searchParams.get("expiringDays") || ""

    const where: Record<string, unknown> = {
      tenant_id: BigInt(1),
    }

    if (search) {
      where.domain = { contains: search }
    }

    if (status && status !== "all") {
      where.status = status
    }

    if (clientId) {
      if (clientId === "unassigned") {
        where.clientId = null
      } else {
        where.clientId = BigInt(clientId)
      }
    }

    if (expiringDays) {
      const daysFromNow = parseInt(expiringDays)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysFromNow)
      where.expirationDate = {
        lte: futureDate,
        gte: new Date(),
      }
    }

    const [domains, total, expiringCount] = await Promise.all([
      prisma.domain.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
        orderBy: [
          { expirationDate: "asc" },
          { domain: "asc" },
        ],
      }),
      prisma.domain.count({ where: { tenant_id: BigInt(1) } }),
      prisma.domain.count({
        where: {
          tenant_id: BigInt(1),
          expirationDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
    ])

    return NextResponse.json({
      domains: domains.map((d) => {
        // Determine DNS provider from nameServerType
        let dnsProvider: "ovh" | "cloudflare" | "external" | "unknown" = "unknown"
        if (d.nameServerType) {
          const nsType = d.nameServerType.toLowerCase()
          if (nsType === "hosted" || nsType === "ovh") {
            dnsProvider = "ovh"
          } else if (nsType === "external") {
            dnsProvider = "external"
          }
        }

        return {
          id: d.id.toString(),
          domain: d.domain,
          registrar: d.registrar,
          externalId: d.externalId,
          status: d.status,
          nameServerType: d.nameServerType,
          dnsProvider,
          offer: d.offer,
          expirationDate: d.expirationDate?.toISOString() || null,
          autoRenew: d.autoRenew,
          notes: d.notes,
          purchasePrice: d.purchasePrice ? Number(d.purchasePrice) : null,
          resalePrice: d.resalePrice ? Number(d.resalePrice) : null,
          renewalCostPrice: d.renewalCostPrice ? Number(d.renewalCostPrice) : null,
          renewalResalePrice: d.renewalResalePrice ? Number(d.renewalResalePrice) : null,
          lastSyncAt: d.lastSyncAt?.toISOString() || null,
          createdAt: d.createdAt?.toISOString() || null,
          clientId: d.clientId?.toString() || null,
          client: d.client
            ? {
                id: d.client.id.toString(),
                companyName: d.client.companyName,
              }
            : null,
        }
      }),
      stats: {
        total,
        expiringCount,
      },
    })
  } catch (error) {
    console.error("Error fetching domains:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des domaines" },
      { status: 500 }
    )
  }
}
