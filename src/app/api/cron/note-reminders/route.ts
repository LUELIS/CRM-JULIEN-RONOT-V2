import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { parseSlackConfig } from "@/lib/slack"
import { sendPushNotification, isPushConfigured } from "@/lib/push-notifications"

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

// Send Slack notification for note reminder
async function sendSlackReminder(
  config: NonNullable<Awaited<ReturnType<typeof getSlackConfig>>>,
  note: {
    id: bigint
    content: string
    type: string
    author: { name: string; slackUserId: string | null }
  },
  noteUrl: string
) {
  if (!config.slackEnabled) return { success: false }

  // Create a preview of the note content
  const preview = note.content.length > 200
    ? note.content.substring(0, 200) + "..."
    : note.content

  const typeEmoji = note.type === "quick" ? ":zap:" : note.type === "todo" ? ":ballot_box_with_check:" : ":memo:"
  const typeName = note.type === "quick" ? "Flash" : note.type === "todo" ? "Tache" : "Note"

  // Mention user if they have a Slack ID
  const userMention = note.author.slackUserId
    ? `<@${note.author.slackUserId}>`
    : note.author.name

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:bell: *Rappel de ${typeName}* ${typeEmoji}\n\n${userMention}, vous avez un rappel programme pour cette note :`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: preview,
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Voir la note",
          emoji: true,
        },
        url: noteUrl,
        action_id: "view_note",
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Note #${note.id.toString()} | ${typeName}`,
        },
      ],
    },
  ]

  const payload = {
    blocks,
    text: `Rappel: ${preview}`,
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
    console.error("[Note Reminder] Slack error:", error)
    return { success: false }
  }
}

// Send email reminder
async function sendEmailReminder(
  note: {
    id: bigint
    content: string
    type: string
    author: { name: string; email: string }
  },
  noteUrl: string,
  tenantName: string
) {
  const preview = note.content.length > 500
    ? note.content.substring(0, 500) + "..."
    : note.content

  const typeName = note.type === "quick" ? "Flash" : note.type === "todo" ? "Tache" : "Note"

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
          <div style="background: linear-gradient(135deg, #0064FA 0%, #5F00BA 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
              Rappel de ${typeName}
            </h1>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Bonjour ${note.author.name},
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Vous avez programme un rappel pour cette note :
            </p>

            <!-- Note Preview -->
            <div style="background: #F5F5F5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #0064FA;">
              <div style="color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${preview}</div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${noteUrl}" style="display: inline-block; background: #0064FA; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Voir la note
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
    to: note.author.email,
    subject: `Rappel: ${typeName} - ${note.content.substring(0, 50)}${note.content.length > 50 ? "..." : ""}`,
    html,
  })
}

// Create in-app notification
async function createInAppNotification(
  note: {
    id: bigint
    content: string
    type: string
    author: { id: bigint }
    tenant_id: bigint
  },
  noteUrl: string
) {
  const typeName = note.type === "quick" ? "Flash" : note.type === "todo" ? "Tache" : "Note"
  const preview = note.content.length > 100
    ? note.content.substring(0, 100) + "..."
    : note.content

  await prisma.notification.create({
    data: {
      tenant_id: note.tenant_id,
      userId: note.author.id,
      type: "note_reminder",
      title: `Rappel: ${typeName}`,
      message: preview,
      link: noteUrl,
      entityType: "note",
      entityId: note.id,
      metadata: JSON.stringify({ noteId: note.id.toString(), noteType: note.type }),
    },
  })
}

// GET: Cron job endpoint
export async function GET() {
  try {
    console.log("[Note Reminder] Starting reminder check...")

    const now = new Date()

    // Find all notes with pending reminders
    const pendingReminders = await prisma.note.findMany({
      where: {
        reminderAt: { lte: now },
        reminderSent: false,
        isRecycle: false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            slackUserId: true,
          },
        },
      },
    })

    console.log(`[Note Reminder] Found ${pendingReminders.length} pending reminders`)

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
    let pushSent = 0
    let notificationsCreated = 0

    for (const note of pendingReminders) {
      const noteUrl = `${baseUrl}/notes?highlight=${note.id}`
      const typeName = note.type === "quick" ? "Flash" : note.type === "todo" ? "Tache" : "Note"
      const preview = note.content.length > 100
        ? note.content.substring(0, 100) + "..."
        : note.content

      try {
        // 1. Create in-app notification
        await createInAppNotification(note, noteUrl)
        notificationsCreated++

        // 2. Send email
        if (note.author.email) {
          const emailResult = await sendEmailReminder(
            note,
            noteUrl,
            tenant?.name || "CRM"
          )
          if (emailResult.success) emailsSent++
        }

        // 3. Send Slack notification
        if (slackConfig && slackConfig.slackEnabled) {
          const slackResult = await sendSlackReminder(slackConfig, note, noteUrl)
          if (slackResult.success) slacksSent++
        }

        // 4. Send push notification
        if (isPushConfigured()) {
          const pushResult = await sendPushNotification(note.author.id, {
            title: `Rappel: ${typeName}`,
            body: preview,
            url: `/notes?highlight=${note.id}`,
            tag: `note-reminder-${note.id}`,
            icon: "/icons/icon-192x192.png",
          })
          if (pushResult.success > 0) pushSent++
        }

        // Mark reminder as sent
        await prisma.note.update({
          where: { id: note.id },
          data: { reminderSent: true },
        })

        processed++
      } catch (error) {
        console.error(`[Note Reminder] Error processing note ${note.id}:`, error)
        // Continue with other notes even if one fails
      }
    }

    console.log(`[Note Reminder] Complete: ${processed} processed, ${emailsSent} emails, ${slacksSent} slacks, ${pushSent} push, ${notificationsCreated} notifications`)

    return NextResponse.json({
      success: true,
      message: `Reminders processed: ${processed}`,
      stats: {
        processed,
        emailsSent,
        slacksSent,
        pushSent,
        notificationsCreated,
        total: pendingReminders.length,
      },
    })
  } catch (error) {
    console.error("[Note Reminder] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Reminder error",
      },
      { status: 500 }
    )
  }
}
