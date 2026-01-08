import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Cron Job - Check domain renewals and create notifications
// Recommended schedule: 0 7 * * * (daily at 7:00 AM)
// Authentication is handled by middleware via x-cron-secret header

const DEFAULT_DAYS_THRESHOLD = 30

export async function GET() {
  try {
    const daysThreshold = DEFAULT_DAYS_THRESHOLD

    // Calculate the date threshold
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold)

    // Find domains expiring within the threshold
    const expiringDomains = await prisma.domain.findMany({
      where: {
        tenant_id: BigInt(1),
        status: "active",
        expirationDate: {
          lte: thresholdDate,
          gte: new Date(), // Not already expired
        },
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: { expirationDate: "asc" },
    })

    let notificationsCreated = 0
    let notificationsSkipped = 0

    for (const domain of expiringDomains) {
      // Check if a notification for this domain already exists (within last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const existingNotification = await prisma.notification.findFirst({
        where: {
          tenant_id: BigInt(1),
          entityType: "domain",
          entityId: domain.id,
          type: "domain_expiring",
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      })

      if (existingNotification) {
        notificationsSkipped++
        continue
      }

      // Calculate days until expiration
      const daysUntilExpiration = domain.expirationDate
        ? Math.ceil(
            (domain.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : 0

      // Determine urgency level
      let urgency = "info"
      if (daysUntilExpiration <= 7) {
        urgency = "critical"
      } else if (daysUntilExpiration <= 14) {
        urgency = "warning"
      }

      // Create notification
      const clientInfo = domain.client
        ? ` (${domain.client.companyName})`
        : ""

      await prisma.notification.create({
        data: {
          tenant_id: BigInt(1),
          type: "domain_expiring",
          title:
            daysUntilExpiration <= 7
              ? `Domaine expire dans ${daysUntilExpiration} jour${daysUntilExpiration > 1 ? "s" : ""} !`
              : `Domaine expire bientôt`,
          message: `Le domaine ${domain.domain}${clientInfo} expire le ${domain.expirationDate?.toLocaleDateString("fr-FR")} (dans ${daysUntilExpiration} jours)`,
          link: `/domains/${domain.id}`,
          entityType: "domain",
          entityId: domain.id,
          metadata: JSON.stringify({
            urgency,
            daysUntilExpiration,
            domainName: domain.domain,
            expirationDate: domain.expirationDate?.toISOString(),
            clientId: domain.clientId?.toString() || null,
            clientName: domain.client?.companyName || null,
          }),
        },
      })

      notificationsCreated++
    }

    // Also check for already expired domains
    const expiredDomains = await prisma.domain.findMany({
      where: {
        tenant_id: BigInt(1),
        status: "active", // Still marked as active but expired
        expirationDate: {
          lt: new Date(),
        },
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })

    for (const domain of expiredDomains) {
      // Check if notification already exists for this expired domain
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const existingNotification = await prisma.notification.findFirst({
        where: {
          tenant_id: BigInt(1),
          entityType: "domain",
          entityId: domain.id,
          type: "domain_expired",
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
      })

      if (existingNotification) {
        notificationsSkipped++
        continue
      }

      const clientInfo = domain.client ? ` (${domain.client.companyName})` : ""

      await prisma.notification.create({
        data: {
          tenant_id: BigInt(1),
          type: "domain_expired",
          title: "Domaine expiré !",
          message: `Le domaine ${domain.domain}${clientInfo} a expiré le ${domain.expirationDate?.toLocaleDateString("fr-FR")}`,
          link: `/domains/${domain.id}`,
          entityType: "domain",
          entityId: domain.id,
          metadata: JSON.stringify({
            urgency: "critical",
            domainName: domain.domain,
            expirationDate: domain.expirationDate?.toISOString(),
            clientId: domain.clientId?.toString() || null,
            clientName: domain.client?.companyName || null,
          }),
        },
      })

      notificationsCreated++

      // Update domain status to expired
      await prisma.domain.update({
        where: { id: domain.id },
        data: { status: "expired" },
      })
    }

    console.log(`[Domain Renewals Cron] Checked ${expiringDomains.length + expiredDomains.length} domains, created ${notificationsCreated} notifications`)

    return NextResponse.json({
      success: true,
      message: `Vérification terminée: ${notificationsCreated} notification(s) créée(s)`,
      stats: {
        domainsChecked: expiringDomains.length + expiredDomains.length,
        expiringCount: expiringDomains.length,
        expiredCount: expiredDomains.length,
        notificationsCreated,
        notificationsSkipped,
      },
    })
  } catch (error) {
    console.error("[Domain Renewals Cron] Error:", error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de la vérification",
    })
  }
}

// POST: Same as GET (for flexibility)
export async function POST() {
  return GET()
}
