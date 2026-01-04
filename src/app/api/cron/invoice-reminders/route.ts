import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { parseSlackConfig } from "@/lib/slack"
import { sendPushToTenant, isPushConfigured } from "@/lib/push-notifications"

// Vercel Cron Job - runs daily at 8am
// Configured in vercel.json

// Get Slack config from tenant settings
async function getSlackConfig() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })
  if (!tenant?.settings) return null
  const settings = JSON.parse(tenant.settings as string)
  return parseSlackConfig(settings)
}

// Get tenant settings
async function getTenantSettings() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
    select: {
      id: true,
      name: true,
      settings: true,
    }
  })
  return tenant
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

// Send Slack notification for overdue invoices
async function sendSlackOverdueAlert(
  config: NonNullable<Awaited<ReturnType<typeof getSlackConfig>>>,
  overdueCount: number,
  totalAmount: number,
  baseUrl: string
) {
  if (!config.slackEnabled) return { success: false }

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:warning: *Alerte Factures en Retard*\n\nVous avez *${overdueCount} facture${overdueCount > 1 ? "s" : ""}* en retard de paiement pour un total de *${formatCurrency(totalAmount)}*.`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Voir les factures",
            emoji: true,
          },
          url: `${baseUrl}/invoices?status=overdue`,
          action_id: "view_invoices",
        },
      ],
    },
  ]

  const payload = {
    blocks,
    text: `Alerte: ${overdueCount} facture(s) en retard - ${formatCurrency(totalAmount)}`,
  }

  try {
    if (config.slackWebhookUrl) {
      const response = await fetch(config.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return { success: response.ok }
    }

    if (config.slackBotToken && config.slackChannelId) {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.slackBotToken}`,
        },
        body: JSON.stringify({
          channel: config.slackChannelId,
          ...payload,
        }),
      })
      const data = await response.json()
      return { success: data.ok }
    }

    return { success: false }
  } catch (error) {
    console.error("[Invoice Reminder] Slack error:", error)
    return { success: false }
  }
}

// Send reminder email to client
async function sendClientReminder(
  invoice: {
    id: bigint
    invoiceNumber: string
    totalTtc: number
    dueDate: Date
    client: { companyName: string; email: string | null; contactEmail: string | null }
  },
  invoiceUrl: string,
  tenantName: string,
  daysOverdue: number
) {
  const clientEmail = invoice.client.contactEmail || invoice.client.email
  if (!clientEmail) return { success: false, reason: "no_email" }

  const isOverdue = daysOverdue > 0
  const subject = isOverdue
    ? `[Rappel] Facture ${invoice.invoiceNumber} en retard de paiement`
    : `Rappel: Facture ${invoice.invoiceNumber} arrive a echeance`

  const message = isOverdue
    ? `Votre facture ${invoice.invoiceNumber} de ${formatCurrency(invoice.totalTtc)} est en retard de ${daysOverdue} jour${daysOverdue > 1 ? "s" : ""}.`
    : `Votre facture ${invoice.invoiceNumber} de ${formatCurrency(invoice.totalTtc)} arrive a echeance le ${invoice.dueDate.toLocaleDateString("fr-FR")}.`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: ${isOverdue ? "linear-gradient(135deg, #DC2626 0%, #F97316 100%)" : "linear-gradient(135deg, #0064FA 0%, #5F00BA 100%)"}; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
              ${isOverdue ? "Rappel de Paiement" : "Echeance Proche"}
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Bonjour,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              ${message}
            </p>

            <!-- Invoice Summary -->
            <div style="background: #F5F5F5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${isOverdue ? "#DC2626" : "#0064FA"};">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #666; padding: 8px 0;">Numero de facture</td>
                  <td style="color: #333; font-weight: 600; text-align: right;">${invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #666; padding: 8px 0;">Montant TTC</td>
                  <td style="color: #333; font-weight: 600; text-align: right;">${formatCurrency(invoice.totalTtc)}</td>
                </tr>
                <tr>
                  <td style="color: #666; padding: 8px 0;">Echeance</td>
                  <td style="color: ${isOverdue ? "#DC2626" : "#333"}; font-weight: 600; text-align: right;">
                    ${invoice.dueDate.toLocaleDateString("fr-FR")}
                    ${isOverdue ? ` (${daysOverdue}j de retard)` : ""}
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceUrl}" style="display: inline-block; background: ${isOverdue ? "#DC2626" : "#0064FA"}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Voir et payer la facture
              </a>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
              Si vous avez deja effectue le paiement, merci de ne pas tenir compte de ce message.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #F9F9F9; padding: 20px; text-align: center; border-top: 1px solid #EEE;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              ${tenantName} | Cet email a ete envoye automatiquement
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: clientEmail,
    subject,
    html,
  })
}

// Create in-app notification for team
async function createTeamNotification(
  tenantId: bigint,
  overdueCount: number,
  totalAmount: number
) {
  // Get all active users of the tenant to notify
  const users = await prisma.user.findMany({
    where: {
      tenant_id: tenantId,
      isActive: true,
    },
    select: { id: true },
  })

  // Create notification for each user
  for (const user of users) {
    await prisma.notification.create({
      data: {
        tenant_id: tenantId,
        userId: user.id,
        type: "invoice",
        title: `${overdueCount} facture${overdueCount > 1 ? "s" : ""} en retard`,
        message: `Montant total: ${formatCurrency(totalAmount)}`,
        link: "/invoices?status=overdue",
        entityType: "invoice",
        metadata: JSON.stringify({
          overdueCount,
          totalAmount,
        }),
      },
    })
  }

  return users.length
}

// GET: Cron job endpoint
export async function GET() {
  try {
    console.log("[Invoice Reminder] Starting invoice reminder check...")

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Find overdue invoices (due date passed, status is 'sent')
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "sent",
        dueDate: { lt: today },
      },
      include: {
        client: {
          select: {
            companyName: true,
            email: true,
            contactEmail: true,
          },
        },
      },
    })

    // Find invoices due in 3 days (only status 'sent')
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    const dueSoonInvoices = await prisma.invoice.findMany({
      where: {
        status: "sent",
        dueDate: {
          gte: today,
          lte: threeDaysFromNow,
        },
      },
      include: {
        client: {
          select: {
            companyName: true,
            email: true,
            contactEmail: true,
          },
        },
      },
    })

    console.log(`[Invoice Reminder] Found ${overdueInvoices.length} overdue, ${dueSoonInvoices.length} due soon`)

    if (overdueInvoices.length === 0 && dueSoonInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No invoice reminders needed",
        stats: { overdue: 0, dueSoon: 0 },
      })
    }

    // Get tenant settings
    const tenant = await getTenantSettings()
    const slackConfig = await getSlackConfig()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.julienronot.fr"

    let emailsSent = 0
    let slackSent = false
    let pushSent = 0
    let notificationsCreated = 0

    // Process overdue invoices
    if (overdueInvoices.length > 0) {
      const totalOverdueAmount = overdueInvoices.reduce(
        (sum, inv) => sum + Number(inv.totalTtc),
        0
      )

      // Send Slack alert
      if (slackConfig && slackConfig.slackEnabled) {
        const slackResult = await sendSlackOverdueAlert(
          slackConfig,
          overdueInvoices.length,
          totalOverdueAmount,
          baseUrl
        )
        slackSent = slackResult.success
      }

      // Send push notification to team
      if (isPushConfigured() && tenant) {
        const pushResult = await sendPushToTenant(tenant.id, {
          title: `${overdueInvoices.length} facture${overdueInvoices.length > 1 ? "s" : ""} en retard`,
          body: `Montant total: ${formatCurrency(totalOverdueAmount)}`,
          url: "/invoices?status=overdue",
          tag: "invoice-overdue-alert",
          icon: "/icons/icon-192x192.png",
        })
        pushSent = pushResult.success
      }

      // Create team notifications
      if (tenant) {
        notificationsCreated = await createTeamNotification(
          tenant.id,
          overdueInvoices.length,
          totalOverdueAmount
        )
      }

      // Send reminder emails to clients (limit to once per week for overdue)
      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Only send reminder at specific intervals: 1, 7, 14, 30 days overdue
        if ([1, 7, 14, 30].includes(daysOverdue)) {
          const invoiceUrl = invoice.publicToken
            ? `${baseUrl}/client/invoices/${invoice.publicToken}`
            : `${baseUrl}/invoices/${invoice.id}`

          const emailResult = await sendClientReminder(
            {
              ...invoice,
              totalTtc: Number(invoice.totalTtc),
              dueDate: new Date(invoice.dueDate),
            },
            invoiceUrl,
            tenant?.name || "CRM",
            daysOverdue
          )
          if (emailResult.success) emailsSent++
        }
      }
    }

    // Process due soon invoices (send reminder 3 days before)
    for (const invoice of dueSoonInvoices) {
      const daysUntilDue = Math.floor(
        (new Date(invoice.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Send reminder at 3 days before
      if (daysUntilDue === 3) {
        const invoiceUrl = invoice.publicToken
          ? `${baseUrl}/client/invoices/${invoice.publicToken}`
          : `${baseUrl}/invoices/${invoice.id}`

        const emailResult = await sendClientReminder(
          {
            ...invoice,
            totalTtc: Number(invoice.totalTtc),
            dueDate: new Date(invoice.dueDate),
          },
          invoiceUrl,
          tenant?.name || "CRM",
          0
        )
        if (emailResult.success) emailsSent++
      }
    }

    console.log(`[Invoice Reminder] Complete: ${emailsSent} emails, slack=${slackSent}, ${pushSent} push, ${notificationsCreated} notifications`)

    return NextResponse.json({
      success: true,
      message: "Invoice reminders processed",
      stats: {
        overdue: overdueInvoices.length,
        dueSoon: dueSoonInvoices.length,
        emailsSent,
        slackSent,
        pushSent,
        notificationsCreated,
      },
    })
  } catch (error) {
    console.error("[Invoice Reminder] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Reminder error",
      },
      { status: 500 }
    )
  }
}
