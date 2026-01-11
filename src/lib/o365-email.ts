import { prisma } from "@/lib/prisma"

// Get O365 settings from tenant
async function getO365Settings() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    return {
      enabled: settings.o365Enabled,
      clientId: settings.o365ClientId,
      clientSecret: settings.o365ClientSecret,
      tenantId: settings.o365TenantId,
      supportEmail: settings.o365SupportEmail,
      accessToken: settings.o365AccessToken,
      refreshToken: settings.o365RefreshToken,
      tokenExpiresAt: settings.o365TokenExpiresAt ? new Date(settings.o365TokenExpiresAt) : null,
    }
  } catch {
    return null
  }
}

// Update settings in database
async function updateSettings(updates: Record<string, unknown>) {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant) return

  const currentSettings = tenant.settings ? JSON.parse(tenant.settings) : {}
  const updatedSettings = { ...currentSettings, ...updates }

  await prisma.tenants.update({
    where: { id: BigInt(1) },
    data: { settings: JSON.stringify(updatedSettings) },
  })
}

// Refresh access token using refresh token
async function refreshAccessToken(settings: {
  clientId: string
  clientSecret: string
  tenantId: string
  refreshToken: string
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  const tokenUrl = `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      refresh_token: settings.refreshToken,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access",
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error("[O365] Token refresh failed:", error)
    return null
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || settings.refreshToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

// Get valid access token (refresh if needed)
export async function getValidAccessToken(): Promise<string | null> {
  const settings = await getO365Settings()

  if (!settings?.enabled || !settings.refreshToken) {
    return null
  }

  // Check if current token is still valid (with 5 min buffer)
  if (settings.accessToken && settings.tokenExpiresAt) {
    const expiresAt = new Date(settings.tokenExpiresAt)
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return settings.accessToken
    }
  }

  // Token expired or about to expire, refresh it
  console.log("[O365] Refreshing access token...")
  const newTokens = await refreshAccessToken({
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    tenantId: settings.tenantId,
    refreshToken: settings.refreshToken,
  })

  if (!newTokens) {
    // Refresh failed - clear tokens
    await updateSettings({
      o365AccessToken: null,
      o365RefreshToken: null,
      o365TokenExpiresAt: null,
      o365ConnectedEmail: null,
    })
    return null
  }

  // Save new tokens
  await updateSettings({
    o365AccessToken: newTokens.accessToken,
    o365RefreshToken: newTokens.refreshToken,
    o365TokenExpiresAt: newTokens.expiresAt.toISOString(),
  })

  return newTokens.accessToken
}

// Send email via Microsoft Graph API
export async function sendO365Email(options: {
  to: string
  subject: string
  body: string
  isHtml?: boolean
  replyToMessageId?: string
  cc?: string[]
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = await getValidAccessToken()

  if (!accessToken) {
    return { success: false, error: "O365 non connecté ou token expiré" }
  }

  const message = {
    message: {
      subject: options.subject,
      body: {
        contentType: options.isHtml ? "HTML" : "Text",
        content: options.body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: options.to,
          },
        },
      ],
      ...(options.cc && options.cc.length > 0
        ? {
            ccRecipients: options.cc.map((email) => ({
              emailAddress: { address: email },
            })),
          }
        : {}),
    },
    saveToSentItems: true,
  }

  try {
    // If replying to a message, use reply endpoint
    if (options.replyToMessageId) {
      const replyResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${options.replyToMessageId}/reply`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              body: {
                contentType: options.isHtml ? "HTML" : "Text",
                content: options.body,
              },
            },
          }),
        }
      )

      if (!replyResponse.ok) {
        const error = await replyResponse.json()
        console.error("[O365] Reply error:", error)
        // Fall through to send as new message
      } else {
        return { success: true }
      }
    }

    // Send as new message
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error("[O365] Send email error:", error)
      return {
        success: false,
        error: error.error?.message || "Erreur lors de l'envoi",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[O365] Send email exception:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

// Clean HTML content for display (strip scripts, styles, etc.)
export function cleanHtmlContent(html: string): string {
  if (!html) return ""

  // Remove script tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")

  // Remove style tags
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")

  // Remove meta tags
  cleaned = cleaned.replace(/<meta[^>]*>/gi, "")

  // Remove head section entirely
  cleaned = cleaned.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, "")

  // Remove html and body tags but keep content
  cleaned = cleaned.replace(/<\/?html[^>]*>/gi, "")
  cleaned = cleaned.replace(/<\/?body[^>]*>/gi, "")

  // Remove onclick and other event handlers
  cleaned = cleaned.replace(/\s*on\w+="[^"]*"/gi, "")
  cleaned = cleaned.replace(/\s*on\w+='[^']*'/gi, "")

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n")
  cleaned = cleaned.trim()

  return cleaned
}

// Generate professional email template for ticket responses
// Uses unified CRM design: #0064FA primary color, clean Outlook/Gmail compatible
export function generateTicketEmailTemplate(options: {
  logo?: string | null
  companyName: string
  ticketNumber: string
  subject: string
  newMessage: string
  senderName: string
  senderEmail: string
  recipientName: string
  history?: Array<{
    content: string
    senderName: string
    isStaff: boolean
    date: Date
  }>
  portalUrl?: string
}): string {
  const {
    logo,
    companyName,
    ticketNumber,
    subject,
    newMessage,
    senderName,
    senderEmail,
    recipientName,
    history = [],
    portalUrl,
  } = options

  // Format date in French
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(date)
  }

  // Generate history HTML (only last 5 messages)
  const historyHtml = history.slice(-5).map((msg) => `
    <tr>
      <td style="padding: 12px 16px; background-color: ${msg.isStaff ? "#F0F7FF" : "#F9FAFB"}; border-radius: 8px; border-left: 4px solid ${msg.isStaff ? "#0064FA" : "#E5E7EB"}; margin-bottom: 12px;">
        <p style="margin: 0 0 6px 0; font-size: 12px; color: #6B7280;">
          <strong style="color: #374151;">${msg.senderName}</strong> &bull; ${formatDate(msg.date)}
        </p>
        <div style="color: #374151; font-size: 14px; line-height: 1.5;">
          ${cleanHtmlContent(msg.content)}
        </div>
      </td>
    </tr>
    <tr><td style="height: 12px;"></td></tr>
  `).join("")

  // Logo section
  const logoSection = logo
    ? `<img src="${logo}" alt="${companyName}" style="max-height: 48px; max-width: 180px;" />`
    : `<span style="font-size: 24px; font-weight: bold; color: #0064FA;">${companyName}</span>`

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!--[if mso]>
    <style type="text/css">
      body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
    </style>
    <![endif]-->
  </head>
  <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F3F4F6">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 560px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

            <!-- Header with colored background for Outlook compatibility -->
            <!--[if mso]>
            <tr>
              <td bgcolor="#0064FA" style="padding: 0;">
            <![endif]-->
            <tr>
              <td bgcolor="#0064FA" style="padding: 28px 40px; background-color: #0064FA;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      ${logo
                        ? `<img src="${logo}" alt="${companyName}" style="max-height: 40px; max-width: 160px;" />`
                        : `<span style="font-size: 22px; font-weight: bold; color: #FFFFFF;">${companyName}</span>`
                      }
                    </td>
                    <td align="right">
                      <p style="margin: 0; font-size: 12px; color: #B3D4FF;">Ticket</p>
                      <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #FFFFFF;">${ticketNumber}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!--[if mso]>
              </td>
            </tr>
            <![endif]-->

            <!-- Subject Banner -->
            <!--[if mso]>
            <tr>
              <td bgcolor="#003D99" style="padding: 0;">
            <![endif]-->
            <tr>
              <td bgcolor="#003D99" style="padding: 16px 40px; background-color: #003D99;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #99B3E6; text-transform: uppercase; letter-spacing: 0.5px;">Objet</p>
                <p style="margin: 0; font-size: 15px; color: #FFFFFF; font-weight: 500;">${subject}</p>
              </td>
            </tr>
            <!--[if mso]>
              </td>
            </tr>
            <![endif]-->

            <!-- Content -->
            <tr>
              <td style="padding: 32px 40px;">
                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                  Bonjour <strong>${recipientName.split(" ")[0]}</strong>,
                </p>

                <!-- New Message -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 20px; background-color: #F0F7FF; border-radius: 8px; border-left: 4px solid #0064FA;">
                      <p style="margin: 0 0 4px 0; color: #0064FA; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Nouvelle réponse</p>
                      <div style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 12px;">
                        ${newMessage}
                      </div>
                    </td>
                  </tr>
                </table>

                ${portalUrl ? `
                <!-- Button -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                  <tr>
                    <td align="center">
                      <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${portalUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" stroke="f" fillcolor="#0064FA">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Voir le ticket</center>
                      </v:roundrect>
                      <![endif]-->
                      <!--[if !mso]><!-->
                      <a href="${portalUrl}" style="display: inline-block; background-color: #0064FA; color: #ffffff; text-decoration: none; padding: 14px 40px; font-size: 15px; font-weight: 600; border-radius: 8px; mso-hide: all;">
                        Voir le ticket
                      </a>
                      <!--<![endif]-->
                    </td>
                  </tr>
                </table>
                ` : ""}

                ${history.length > 0 ? `
                <!-- History Section -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 24px;">
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <p style="margin: 0; color: #6B7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Historique de la conversation
                      </p>
                    </td>
                  </tr>
                  ${historyHtml}
                </table>
                ` : ""}

                <!-- Reply Notice -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                  <tr>
                    <td style="padding: 16px; background-color: #F9FAFB; border-radius: 8px;">
                      <p style="margin: 0; color: #6B7280; font-size: 13px; text-align: center;">
                        Répondez directement à cet email pour continuer la conversation.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 40px; border-top: 1px solid #E5E7EB; background-color: #F9FAFB;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td>
                      <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 600;">${senderName}</p>
                      <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 12px;">${companyName}</p>
                      <a href="mailto:${senderEmail}" style="color: #0064FA; font-size: 12px; text-decoration: none;">${senderEmail}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Bottom Text -->
            <tr>
              <td style="padding: 16px 40px; border-top: 1px solid #E5E7EB;">
                <p style="color: #9CA3AF; font-size: 11px; margin: 0; text-align: center;">
                  ${companyName} &bull; Cet email a été envoyé automatiquement
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

// Extract plain text from HTML
export function htmlToPlainText(html: string): string {
  if (!html) return ""

  // First clean the HTML
  let text = cleanHtmlContent(html)

  // Replace common block elements with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<\/p>/gi, "\n\n")
  text = text.replace(/<\/div>/gi, "\n")
  text = text.replace(/<\/li>/gi, "\n")
  text = text.replace(/<\/tr>/gi, "\n")

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "")

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ")
  text = text.replace(/&amp;/g, "&")
  text = text.replace(/&lt;/g, "<")
  text = text.replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Clean up whitespace
  text = text.replace(/\n\s*\n\s*\n/g, "\n\n")
  text = text.trim()

  return text
}
