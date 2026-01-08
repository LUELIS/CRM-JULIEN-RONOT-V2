import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createOvhClient } from "@/lib/ovh"

// Cron Job - Sync domains from OVH
// Recommended schedule: 0 6 * * * (daily at 6:00 AM)
// Authentication is handled by middleware via x-cron-secret header

export async function GET() {
  try {
    // Get OVH credentials from tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant?.settings) {
      return NextResponse.json({
        success: false,
        message: "Configuration OVH manquante",
      })
    }

    let settings: Record<string, string> = {}
    try {
      settings = JSON.parse(tenant.settings)
    } catch {
      return NextResponse.json({
        success: false,
        message: "Erreur de configuration",
      })
    }

    const { ovhAppKey, ovhAppSecret, ovhConsumerKey, ovhEndpoint } = settings

    if (!ovhAppKey || !ovhAppSecret || !ovhConsumerKey) {
      return NextResponse.json({
        success: false,
        message: "Clés API OVH non configurées",
      })
    }

    const client = createOvhClient({
      appKey: ovhAppKey,
      appSecret: ovhAppSecret,
      consumerKey: ovhConsumerKey,
      endpoint: ovhEndpoint || "ovh-eu",
    })

    // Get all domains with info
    const domainsWithInfo = await client.getDomainsWithInfo()

    let created = 0
    let updated = 0

    for (const domainInfo of domainsWithInfo) {
      const existing = await prisma.domain.findFirst({
        where: {
          tenant_id: BigInt(1),
          domain: domainInfo.domain,
        },
      })

      const expirationDate = domainInfo.expiration
        ? new Date(domainInfo.expiration)
        : null

      // Map OVH status to our status
      let status: "active" | "expired" | "pending_transfer" | "pending_delete" | "suspended" = "active"
      if (domainInfo.status === "expired") {
        status = "expired"
      } else if (domainInfo.status === "suspended") {
        status = "suspended"
      }

      if (existing) {
        await prisma.domain.update({
          where: { id: existing.id },
          data: {
            status,
            nameServerType: domainInfo.nameServerType || null,
            offer: domainInfo.offer || null,
            expirationDate,
            lastSyncAt: new Date(),
          },
        })
        updated++
      } else {
        await prisma.domain.create({
          data: {
            tenant_id: BigInt(1),
            domain: domainInfo.domain,
            registrar: "ovh",
            externalId: domainInfo.domain,
            status,
            nameServerType: domainInfo.nameServerType || null,
            offer: domainInfo.offer || null,
            expirationDate,
            autoRenew: true,
            lastSyncAt: new Date(),
          },
        })
        created++
      }
    }

    console.log(`[Domain Sync Cron] Synced ${domainsWithInfo.length} domains: ${created} created, ${updated} updated`)

    return NextResponse.json({
      success: true,
      message: `Synchronisation terminée: ${created} créé(s), ${updated} mis à jour`,
      created,
      updated,
      total: domainsWithInfo.length,
    })
  } catch (error) {
    console.error("[Domain Sync Cron] Error:", error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de la synchronisation",
    })
  }
}

// POST: Same as GET (for flexibility)
export async function POST() {
  return GET()
}
