/**
 * Slack Notification Service
 * Handles all Slack notifications for tickets
 */

interface SlackConfig {
  slackEnabled: boolean
  slackWebhookUrl: string
  slackBotToken: string
  slackChannelId: string
  slackNotifyOnNew: boolean
  slackNotifyOnReply: boolean
}

interface TicketInfo {
  id: string
  ticketNumber: string
  subject: string
  priority: string
  status: string
  senderName: string | null
  senderEmail: string
  clientName?: string | null
}

interface MessageInfo {
  id: string
  content: string
  fromName: string | null
  fromEmail: string | null
  attachmentCount?: number
}

interface UserInfo {
  id: string
  name: string
  slackUserId?: string | null
}

// Truncate message to specified length
function truncateMessage(message: string, length: number = 500): string {
  if (message.length <= length) {
    return message
  }
  return message.substring(0, length) + "..."
}

// Build Slack Block Kit message for new ticket/reply
function buildMessagePayload(
  ticket: TicketInfo,
  message: MessageInfo,
  ticketUrl: string,
  isNewTicket: boolean = false,
  assignee?: UserInfo | null
): object {
  const headerText = isNewTicket ? "🎫 Nouveau ticket" : "📧 Nouvelle réponse client"

  // Build mention text if assignee has Slack ID
  const mentionText = assignee?.slackUserId
    ? `<@${assignee.slackUserId}> `
    : ""

  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: headerText,
        emoji: true,
      },
    },
  ]

  // Add assignee mention if present
  if (mentionText) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `👤 ${mentionText} un client a répondu au ticket assigné`,
        },
      ],
    })
  }

  blocks.push(
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Ticket:*\n#${ticket.ticketNumber}`,
        },
        {
          type: "mrkdwn",
          text: `*Priorité:*\n${getPriorityEmoji(ticket.priority)} ${capitalize(ticket.priority)}`,
        },
        {
          type: "mrkdwn",
          text: `*Client:*\n${message.fromName || ticket.clientName || "Inconnu"}`,
        },
        {
          type: "mrkdwn",
          text: `*Email:*\n${message.fromEmail || ticket.senderEmail}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Sujet:*\n${ticket.subject}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Message:*\n${truncateMessage(message.content, 500)}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🎫 Voir le ticket",
            emoji: true,
          },
          url: ticketUrl,
          style: "primary",
        },
      ],
    }
  )

  // Add attachment info if present
  if (message.attachmentCount && message.attachmentCount > 0) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📎 *Pièces jointes:* ${message.attachmentCount}`,
        },
      ],
    })
  }

  return { blocks }
}

// Build assignment notification payload
function buildAssignmentPayload(
  ticket: TicketInfo,
  assignee: UserInfo,
  ticketUrl: string
): object {
  const mentionText = assignee.slackUserId
    ? `<@${assignee.slackUserId}>`
    : assignee.name

  return {
    text: `Ticket #${ticket.ticketNumber} assigné à ${mentionText}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🎯 Ticket assigné à ${mentionText}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Ticket:*\n#${ticket.ticketNumber}`,
          },
          {
            type: "mrkdwn",
            text: `*Priorité:*\n${getPriorityEmoji(ticket.priority)} ${capitalize(ticket.priority)}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Sujet:*\n${ticket.subject}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "🎫 Voir le ticket",
              emoji: true,
            },
            url: ticketUrl,
            style: "primary",
          },
        ],
      },
    ],
  }
}

// Build reminder notification payload
function buildReminderPayload(
  ticket: TicketInfo,
  reminderNote: string | null,
  users: UserInfo[],
  ticketUrl: string
): object {
  // Build mentions for users with Slack IDs
  const mentions = users
    .filter((u) => u.slackUserId)
    .map((u) => `<@${u.slackUserId}>`)
    .join(" ")

  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "⏰ Rappel de ticket",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Ticket:*\n#${ticket.ticketNumber}`,
        },
        {
          type: "mrkdwn",
          text: `*Statut:*\n${capitalize(ticket.status)}`,
        },
        {
          type: "mrkdwn",
          text: `*Priorité:*\n${getPriorityEmoji(ticket.priority)} ${capitalize(ticket.priority)}`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Sujet:*\n${ticket.subject}`,
      },
    },
  ]

  // Add note if present
  if (reminderNote) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Note du rappel:*\n_${reminderNote}_`,
      },
    })
  }

  // Add mentions
  if (mentions) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `👤 ${mentions}`,
        },
      ],
    })
  }

  // Add button
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "🎫 Voir le ticket",
          emoji: true,
        },
        url: ticketUrl,
        style: "primary",
      },
    ],
  })

  return {
    text: `⏰ Rappel ticket #${ticket.ticketNumber}`,
    blocks,
  }
}

function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case "urgent":
      return "🔥"
    case "high":
      return "⬆️"
    case "normal":
      return "➡️"
    case "low":
      return "⬇️"
    default:
      return "➡️"
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Send message via Slack Bot API
async function sendViaApi(
  botToken: string,
  channelId: string,
  payload: object,
  threadTs?: string
): Promise<{ success: boolean; ts?: string; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      ...payload,
      channel: channelId,
    }

    if (threadTs) {
      body.thread_ts = threadTs
    }

    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (data.ok) {
      return { success: true, ts: data.ts }
    } else {
      console.error("Slack API error:", data.error)
      return { success: false, error: data.error }
    }
  } catch (error) {
    console.error("Slack API request failed:", error)
    return { success: false, error: String(error) }
  }
}

// Send message via Webhook
async function sendViaWebhook(
  webhookUrl: string,
  payload: object
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      return { success: true }
    } else {
      const text = await response.text()
      console.error("Slack Webhook error:", text)
      return { success: false, error: text }
    }
  } catch (error) {
    console.error("Slack Webhook request failed:", error)
    return { success: false, error: String(error) }
  }
}

// Check if we should send notifications
function shouldNotify(config: SlackConfig): boolean {
  if (!config.slackEnabled) return false

  // Need either webhook URL or (bot token + channel ID)
  return !!(
    config.slackWebhookUrl ||
    (config.slackBotToken && config.slackChannelId)
  )
}

// Main notification functions

/**
 * Notify about a new ticket
 */
export async function notifyNewTicket(
  config: SlackConfig,
  ticket: TicketInfo,
  message: MessageInfo,
  ticketUrl: string
): Promise<{ success: boolean; slackTs?: string; error?: string }> {
  if (!shouldNotify(config) || !config.slackNotifyOnNew) {
    return { success: false, error: "Notifications disabled" }
  }

  const payload = buildMessagePayload(ticket, message, ticketUrl, true)

  if (config.slackBotToken && config.slackChannelId) {
    return await sendViaApi(config.slackBotToken, config.slackChannelId, payload)
  } else {
    return await sendViaWebhook(config.slackWebhookUrl, payload)
  }
}

/**
 * Notify about a client reply
 */
export async function notifyClientReply(
  config: SlackConfig,
  ticket: TicketInfo,
  message: MessageInfo,
  ticketUrl: string,
  threadTs?: string,
  assignee?: UserInfo | null
): Promise<{ success: boolean; slackTs?: string; error?: string }> {
  if (!shouldNotify(config) || !config.slackNotifyOnReply) {
    return { success: false, error: "Notifications disabled" }
  }

  const payload = buildMessagePayload(ticket, message, ticketUrl, false, assignee)

  if (config.slackBotToken && config.slackChannelId) {
    return await sendViaApi(
      config.slackBotToken,
      config.slackChannelId,
      payload,
      threadTs
    )
  } else {
    return await sendViaWebhook(config.slackWebhookUrl, payload)
  }
}

/**
 * Notify about ticket assignment
 */
export async function notifyTicketAssignment(
  config: SlackConfig,
  ticket: TicketInfo,
  assignee: UserInfo,
  ticketUrl: string,
  threadTs?: string
): Promise<{ success: boolean; error?: string }> {
  if (!shouldNotify(config)) {
    return { success: false, error: "Notifications disabled" }
  }

  const payload = buildAssignmentPayload(ticket, assignee, ticketUrl)

  if (config.slackBotToken && config.slackChannelId) {
    return await sendViaApi(
      config.slackBotToken,
      config.slackChannelId,
      payload,
      threadTs
    )
  } else {
    return await sendViaWebhook(config.slackWebhookUrl, payload)
  }
}

/**
 * Notify about a ticket reminder
 */
export async function notifyTicketReminder(
  config: SlackConfig,
  ticket: TicketInfo,
  reminderNote: string | null,
  users: UserInfo[],
  ticketUrl: string,
  threadTs?: string
): Promise<{ success: boolean; error?: string }> {
  if (!shouldNotify(config)) {
    return { success: false, error: "Notifications disabled" }
  }

  const payload = buildReminderPayload(ticket, reminderNote, users, ticketUrl)

  if (config.slackBotToken && config.slackChannelId) {
    return await sendViaApi(
      config.slackBotToken,
      config.slackChannelId,
      payload,
      threadTs
    )
  } else {
    return await sendViaWebhook(config.slackWebhookUrl, payload)
  }
}

/**
 * Add reaction to a Slack message
 */
export async function addReactionToMessage(
  botToken: string,
  channelId: string,
  messageTs: string,
  emoji: string = "thumbsup"
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://slack.com/api/reactions.add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        timestamp: messageTs,
        name: emoji,
      }),
    })

    const data = await response.json()

    if (data.ok) {
      return { success: true }
    } else {
      return { success: false, error: data.error }
    }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Test Slack connection
 */
export async function testSlackConnection(
  webhookUrl?: string,
  botToken?: string,
  channelId?: string
): Promise<{ success: boolean; message: string }> {
  // Test via Bot API if token provided
  if (botToken && channelId) {
    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({
          channel: channelId,
          text: "✅ Test de connexion Slack réussi !",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "✅ *Test de connexion Slack réussi !*\nLes notifications de tickets seront envoyées ici.",
              },
            },
          ],
        }),
      })

      const data = await response.json()

      if (data.ok) {
        return { success: true, message: "Connexion Slack réussie ! Message de test envoyé." }
      } else {
        return { success: false, message: `Erreur Slack: ${data.error}` }
      }
    } catch (error) {
      return { success: false, message: `Erreur de connexion: ${error}` }
    }
  }

  // Test via Webhook
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "✅ Test de connexion Slack réussi !",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "✅ *Test de connexion Slack réussi !*\nLes notifications de tickets seront envoyées ici.",
              },
            },
          ],
        }),
      })

      if (response.ok) {
        return { success: true, message: "Connexion Slack réussie ! Message de test envoyé." }
      } else {
        const text = await response.text()
        return { success: false, message: `Erreur Webhook: ${text}` }
      }
    } catch (error) {
      return { success: false, message: `Erreur de connexion: ${error}` }
    }
  }

  return { success: false, message: "Aucune configuration Slack fournie" }
}

/**
 * Get Slack config from tenant settings
 */
export function parseSlackConfig(settings: Record<string, unknown>): SlackConfig {
  return {
    slackEnabled: Boolean(settings.slackEnabled),
    slackWebhookUrl: String(settings.slackWebhookUrl || ""),
    slackBotToken: String(settings.slackBotToken || ""),
    slackChannelId: String(settings.slackChannelId || ""),
    slackNotifyOnNew: settings.slackNotifyOnNew !== false,
    slackNotifyOnReply: settings.slackNotifyOnReply !== false,
  }
}
