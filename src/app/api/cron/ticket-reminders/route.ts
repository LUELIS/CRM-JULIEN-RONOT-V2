import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { parseSlackConfig } from "@/lib/slack"

// Vercel Cron Job - runs every 5 minutes
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

// Get tenant settings for email
async function getTenantSettings() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
    select: {
      name: true,
      settings: true,
    }
  })
  return tenant
}

// Send Slack notification for ticket reminder
async function sendSlackReminder(
  config: NonNullable<Awaited<ReturnType<typeof getSlackConfig>>>,
  reminder: {
    id: bigint
    note: string | null
    ticket: { id: bigint; subject: string }
    user: { name: string; slackUserId: string | null }
  },
  ticketUrl: string
) {
  if (!config.slackEnabled) return { success: false }

  // Mention user if they have a Slack ID
  const userMention = reminder.user.slackUserId
    ? `<@${reminder.user.slackUserId}>`
    : reminder.user.name

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:bell: *Rappel de Ticket* :ticket:\n\n${userMention}, vous avez un rappel programme pour ce ticket :`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${reminder.ticket.subject}*${reminder.note ? `\n\n_${reminder.note}_` : ""}`,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Voir le ticket",
          emoji: true,
        },
        url: ticketUrl,
        action_id: "view_ticket",
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Ticket #${reminder.ticket.id.toString()}`,
        },
      ],
    },
  ]

  const payload = {
    blocks,
    text: `Rappel ticket: ${reminder.ticket.subject}`,
  }

  try {
    // Send via webhook
    if (config.slackWebhookUrl) {
      const response = await fetch(config.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return { success: response.ok }
    }

    // Send via Bot API to channel
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
    console.error("[Ticket Reminder] Slack error:", error)
    return { success: false }
  }
}

// Send email reminder
async function sendEmailReminder(
  reminder: {
    id: bigint
    note: string | null
    ticket: { id: bigint; subject: string }
    user: { name: string; email: string }
  },
  ticketUrl: string,
  tenantName: string
) {
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
          <div style="background: linear-gradient(135deg, #DCB40A 0%, #F0783C 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
              Rappel de Ticket
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Bonjour ${reminder.user.name},
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Vous avez programme un rappel pour ce ticket :
            </p>

            <!-- Ticket Preview -->
            <div style="background: #F5F5F5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #DCB40A;">
              <div style="color: #333; font-size: 16px; font-weight: 600; margin-bottom: 8px;">
                ${reminder.ticket.subject}
              </div>
              ${reminder.note ? `<div style="color: #666; font-size: 14px; font-style: italic;">${reminder.note}</div>` : ""}
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ticketUrl}" style="display: inline-block; background: #DCB40A; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Voir le ticket
              </a>
            </div>
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
    to: reminder.user.email,
    subject: `Rappel Ticket: ${reminder.ticket.subject}`,
    html,
  })
}

// Create in-app notification
async function createInAppNotification(
  reminder: {
    id: bigint
    note: string | null
    ticket: { id: bigint; subject: string }
    user: { id: bigint }
    tenant_id: bigint
  },
  ticketUrl: string
) {
  await prisma.notification.create({
    data: {
      tenant_id: reminder.tenant_id,
      userId: reminder.user.id,
      type: "ticket",
      title: `Rappel: ${reminder.ticket.subject}`,
      message: reminder.note || `Rappel programme pour le ticket #${reminder.ticket.id}`,
      link: ticketUrl,
      entityType: "ticket",
      entityId: reminder.ticket.id,
      metadata: JSON.stringify({
        ticketId: reminder.ticket.id.toString(),
        reminderId: reminder.id.toString(),
      }),
    },
  })
}

// GET: Cron job endpoint
export async function GET() {
  try {
    console.log("[Ticket Reminder] Starting reminder check...")

    const now = new Date()

    // Find all pending ticket reminders
    const pendingReminders = await prisma.ticketReminder.findMany({
      where: {
        reminderAt: { lte: now },
        status: "pending",
      },
      include: {
        ticket: {
          select: {
            id: true,
            subject: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            slackUserId: true,
          },
        },
      },
    })

    console.log(`[Ticket Reminder] Found ${pendingReminders.length} pending reminders`)

    if (pendingReminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending reminders",
        stats: { processed: 0 },
      })
    }

    // Get tenant settings and Slack config
    const tenant = await getTenantSettings()
    const slackConfig = await getSlackConfig()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.julienronot.fr"

    let processed = 0
    let emailsSent = 0
    let slacksSent = 0
    let notificationsCreated = 0

    for (const reminder of pendingReminders) {
      const ticketUrl = `${baseUrl}/tickets/${reminder.ticketId}`

      try {
        const reminderData = {
          id: reminder.id,
          note: reminder.note,
          ticket: reminder.ticket,
          user: reminder.users,
          tenant_id: reminder.tenant_id,
        }

        // 1. Create in-app notification
        await createInAppNotification(reminderData, ticketUrl)
        notificationsCreated++

        // 2. Send email
        if (reminder.users.email) {
          const emailResult = await sendEmailReminder(
            reminderData,
            ticketUrl,
            tenant?.name || "CRM"
          )
          if (emailResult.success) emailsSent++
        }

        // 3. Send Slack notification
        if (slackConfig && slackConfig.slackEnabled) {
          const slackResult = await sendSlackReminder(slackConfig, reminderData, ticketUrl)
          if (slackResult.success) slacksSent++
        }

        // Mark reminder as sent
        await prisma.ticketReminder.update({
          where: { id: reminder.id },
          data: {
            status: "sent",
            sentAt: new Date(),
          },
        })

        processed++
      } catch (error) {
        console.error(`[Ticket Reminder] Error processing reminder ${reminder.id}:`, error)
        // Continue with other reminders even if one fails
      }
    }

    console.log(`[Ticket Reminder] Complete: ${processed} processed, ${emailsSent} emails, ${slacksSent} slacks, ${notificationsCreated} notifications`)

    return NextResponse.json({
      success: true,
      message: `Reminders processed: ${processed}`,
      stats: {
        processed,
        emailsSent,
        slacksSent,
        notificationsCreated,
        total: pendingReminders.length,
      },
    })
  } catch (error) {
    console.error("[Ticket Reminder] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Reminder error",
      },
      { status: 500 }
    )
  }
}
