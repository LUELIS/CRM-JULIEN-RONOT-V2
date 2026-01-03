import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromAddress: string
  fromName: string
}

interface SendCampaignEmailOptions {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  fromName?: string
  fromEmail?: string
  replyTo?: string
  trackingId?: string
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })

  if (!tenant?.settings) {
    throw new Error("SMTP not configured")
  }

  const settings = JSON.parse(tenant.settings as string)

  if (!settings.smtpHost || !settings.smtpUsername || !settings.smtpPassword) {
    throw new Error("SMTP not fully configured")
  }

  return {
    host: settings.smtpHost,
    port: parseInt(settings.smtpPort || "587"),
    secure: settings.smtpEncryption === "ssl",
    user: settings.smtpUsername,
    password: settings.smtpPassword,
    fromAddress: settings.smtpFromAddress || settings.smtpUsername,
    fromName: settings.smtpFromName || "CRM",
  }
}

function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  })
}

export async function sendCampaignEmail(options: SendCampaignEmailOptions) {
  const config = await getSmtpConfig()
  const transporter = createTransporter(config)

  // Use custom from if provided, otherwise use default
  const fromName = options.fromName || config.fromName
  const fromEmail = options.fromEmail || config.fromAddress

  // Add tracking pixel if trackingId is provided
  let html = options.html
  if (options.trackingId) {
    const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/campaigns/track/open/${options.trackingId}" width="1" height="1" style="display:none" alt="" />`
    html = html.replace("</body>", `${trackingPixel}</body>`)
  }

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
    replyTo: options.replyTo || fromEmail,
    subject: options.subject,
    html,
    text: options.text || html.replace(/<[^>]*>/g, ""),
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending campaign email:", error)
    throw error
  }
}

export function generateTrackingId(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Personalize email content with recipient data
export function personalizeContent(
  content: string,
  recipient: {
    email: string
    name?: string | null
    companyName?: string | null
  }
): string {
  return content
    .replace(/\{\{email\}\}/gi, recipient.email)
    .replace(/\{\{name\}\}/gi, recipient.name || "")
    .replace(/\{\{prenom\}\}/gi, recipient.name?.split(" ")[0] || "")
    .replace(/\{\{nom\}\}/gi, recipient.name?.split(" ").slice(1).join(" ") || "")
    .replace(/\{\{entreprise\}\}/gi, recipient.companyName || "")
    .replace(/\{\{company\}\}/gi, recipient.companyName || "")
}

// Convert tracking links
export function addLinkTracking(html: string, trackingId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ""

  // Replace all links with tracked versions
  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (match, url) => {
      const encodedUrl = encodeURIComponent(url)
      return `href="${baseUrl}/api/campaigns/track/click/${trackingId}?url=${encodedUrl}"`
    }
  )
}
