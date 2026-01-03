import nodemailer from "nodemailer"
import { prisma } from "./prisma"

interface SmtpSettings {
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPassword: string
  smtpEncryption: string
  smtpFromAddress: string
  smtpFromName: string
}

// Cache for SMTP settings (refreshed every 5 minutes)
let cachedSettings: SmtpSettings | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const now = Date.now()

  // Return cached settings if still valid
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings
  }

  try {
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
      select: { settings: true, name: true },
    })

    if (!tenant?.settings) {
      console.warn("No SMTP settings found in database")
      return null
    }

    const rawSettings = JSON.parse(tenant.settings)

    cachedSettings = {
      smtpHost: rawSettings.smtpHost || rawSettings.smtp_host || "",
      smtpPort: parseInt(rawSettings.smtpPort || rawSettings.smtp_port || "587"),
      smtpUsername: rawSettings.smtpUsername || rawSettings.smtp_username || "",
      smtpPassword: rawSettings.smtpPassword || rawSettings.smtp_password || "",
      smtpEncryption: rawSettings.smtpEncryption || rawSettings.smtp_encryption || "tls",
      smtpFromAddress: rawSettings.smtpFromAddress || rawSettings.smtp_from_address || "",
      smtpFromName: rawSettings.smtpFromName || rawSettings.smtp_from_name || tenant.name || "CRM",
    }
    cacheTimestamp = now

    return cachedSettings
  } catch (error) {
    console.error("Error fetching SMTP settings:", error)
    return null
  }
}

async function createTransporter() {
  const settings = await getSmtpSettings()

  if (!settings || !settings.smtpHost || !settings.smtpUsername) {
    throw new Error("SMTP non configuré. Veuillez configurer les paramètres email dans les réglages.")
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpEncryption === "ssl", // true for 465, false for other ports
    auth: {
      user: settings.smtpUsername,
      pass: settings.smtpPassword,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  })
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const settings = await getSmtpSettings()

  if (!settings) {
    throw new Error("SMTP non configuré")
  }

  const transporter = await createTransporter()
  const fromAddress = settings.smtpFromAddress || settings.smtpUsername
  const fromName = settings.smtpFromName || "CRM"

  const mailOptions = {
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""),
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent:", info.messageId, "to:", to)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email to", to, ":", error)
    throw error
  }
}

export async function sendPasswordResetEmail(email: string, token: string, userName: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de mot de passe</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #061140; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px;">
                    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #38b6ff 0%, #0066cc 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                      <span style="font-size: 28px; color: white;">⚡</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 10px 0;">CRM Julien</h1>
                    <p style="color: rgba(56, 182, 255, 0.8); font-size: 14px; margin: 0;">Réinitialisation de mot de passe</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px;">
                    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Bonjour <strong style="color: #38b6ff;">${userName}</strong>,
                    </p>
                    <p style="color: rgba(255,255,255,0.7); font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                      Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
                    </p>

                    <!-- Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #38b6ff 0%, #0066cc 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 20px rgba(56, 182, 255, 0.4);">
                            Réinitialiser mon mot de passe
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: rgba(255,255,255,0.5); font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                      Ce lien expire dans <strong style="color: #38b6ff;">1 heure</strong>.
                    </p>
                    <p style="color: rgba(255,255,255,0.4); font-size: 12px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} CRM Julien. Tous droits réservés.
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

  return sendEmail({
    to: email,
    subject: "Réinitialisation de votre mot de passe - CRM Julien",
    html,
  })
}

export async function sendClientInvitationEmail(
  email: string,
  token: string,
  inviterName: string,
  companyName: string
) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/client/accept-invitation?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation - Espace Client</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F5F5F7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #0064FA 0%, #0052CC 100%);">
                    <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 16px; display: inline-block; line-height: 60px; margin-bottom: 16px;">
                      <span style="font-size: 28px; color: white;">✉️</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 600;">Vous êtes invité !</h1>
                    <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">Espace Client ${companyName}</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px 40px 40px 40px;">
                    <p style="color: #111111; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                      Bonjour,
                    </p>
                    <p style="color: #444444; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                      <strong style="color: #0064FA;">${inviterName}</strong> vous invite à rejoindre l'espace client de <strong>${companyName}</strong>.
                    </p>
                    <p style="color: #444444; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                      Cet espace vous permettra de :
                    </p>
                    <ul style="color: #444444; font-size: 14px; line-height: 1.8; margin: 0 0 32px 0; padding-left: 20px;">
                      <li>Consulter vos factures</li>
                      <li>Voir et accepter vos devis</li>
                      <li>Suivre l'état de vos documents</li>
                    </ul>

                    <!-- Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="${inviteUrl}" style="display: inline-block; background: #0064FA; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 100, 250, 0.3);">
                            Créer mon compte
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666666; font-size: 13px; line-height: 1.6; margin: 32px 0 0 0; text-align: center;">
                      Ce lien expire dans <strong style="color: #0064FA;">72 heures</strong>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background: #F5F5F7; border-top: 1px solid #EEEEEE;">
                    <p style="color: #AEAEAE; font-size: 12px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${companyName}. Tous droits réservés.
                    </p>
                    <p style="color: #AEAEAE; font-size: 11px; margin: 8px 0 0 0; text-align: center;">
                      Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
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

  return sendEmail({
    to: email,
    subject: `Invitation - Espace client ${companyName}`,
    html,
  })
}

export async function sendSignatureRequestEmail(
  email: string,
  signerName: string,
  signingUrl: string,
  contractTitle: string,
  senderName: string,
  senderCompany: string,
  expiresAt?: Date,
  message?: string,
  logoUrl?: string
) {
  const expirationDate = expiresAt
    ? expiresAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const customMessage = message
    ? `<div style="padding: 16px 20px; background: #F0F4FF; border-radius: 10px; margin: 0 0 24px 0; border-left: 4px solid #0064FA;">
        <p style="color: #1a1a1a; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">"${message}"</p>
      </div>`
    : ""

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${senderCompany}" style="max-height: 50px; max-width: 200px; margin-bottom: 16px;">`
    : `<div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 16px; margin: 0 auto 16px auto; line-height: 64px; text-align: center;">
        <span style="font-size: 32px;">✍️</span>
      </div>`

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document à signer - ${contractTitle}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

                <!-- Header with gradient -->
                <tr>
                  <td align="center" style="padding: 48px 40px 32px 40px; background: linear-gradient(135deg, #5F00BA 0%, #0064FA 100%);">
                    ${logoSection}
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 700; letter-spacing: -0.5px;">
                      Document à signer
                    </h1>
                    <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0;">
                      ${senderCompany}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: 600;">
                      Bonjour ${signerName},
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      <strong style="color: #5F00BA;">${senderName}</strong> vous invite à signer un document électroniquement.
                    </p>

                    <!-- Document Card -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 28px 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #f8f9fc 0%, #f0f4ff 100%); border-radius: 14px; padding: 24px; border-left: 5px solid #0064FA;">
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="width: 56px; vertical-align: top;">
                                <div style="width: 56px; height: 56px; background: #e8f0ff; border-radius: 12px; text-align: center; line-height: 56px;">
                                  <span style="font-size: 28px;">📄</span>
                                </div>
                              </td>
                              <td style="padding-left: 20px; vertical-align: middle;">
                                <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                  Document
                                </p>
                                <p style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: 700;">
                                  ${contractTitle}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${customMessage}

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${signingUrl}" style="display: inline-block; background: linear-gradient(135deg, #0064FA 0%, #0052cc 100%); color: #ffffff; text-decoration: none; padding: 18px 56px; border-radius: 12px; font-size: 17px; font-weight: 700; box-shadow: 0 6px 20px rgba(0, 100, 250, 0.35); letter-spacing: 0.3px;">
                            ✍️&nbsp;&nbsp;Signer le document
                          </a>
                        </td>
                      </tr>
                    </table>

                    ${expirationDate ? `
                    <!-- Expiration Notice -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 28px 0 0 0;">
                      <tr>
                        <td style="background-color: #fff8e6; border-radius: 12px; padding: 18px 22px;">
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <span style="font-size: 20px;">⏰</span>
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #92600e; font-size: 14px; line-height: 1.5;">
                                  <strong>Date limite :</strong> ${expirationDate}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Instructions -->
                    <div style="margin: 32px 0 0 0; padding: 24px; background: #fafafa; border-radius: 12px;">
                      <p style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 15px; font-weight: 600;">
                        Comment signer :
                      </p>
                      <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                            <span style="display: inline-block; width: 24px; height: 24px; background: #0064FA; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 12px;">1</span>
                            Cliquez sur le bouton "Signer le document"
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                            <span style="display: inline-block; width: 24px; height: 24px; background: #0064FA; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 12px;">2</span>
                            Vérifiez les informations du document
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                            <span style="display: inline-block; width: 24px; height: 24px; background: #0064FA; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 12px;">3</span>
                            Apposez votre signature électronique
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                            <span style="display: inline-block; width: 24px; height: 24px; background: #10b981; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 12px;">✓</span>
                            Validez pour finaliser
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Security Badge -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 28px 0 0 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 18px 22px;">
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="width: 28px; vertical-align: top;">
                                <span style="font-size: 20px;">🔒</span>
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                                  <strong>Signature sécurisée</strong><br>
                                  <span style="color: #15803d;">Ce document utilise la signature électronique conforme au règlement eIDAS.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; background: #f8f9fc; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                      Ce message a été envoyé par <strong>${senderCompany}</strong>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      Si vous n'attendiez pas ce document, vous pouvez ignorer cet email.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Sub-footer -->
              <p style="color: #9ca3af; font-size: 11px; margin: 24px 0 0 0; text-align: center;">
                © ${new Date().getFullYear()} ${senderCompany} • Signature électronique sécurisée
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `📝 Document à signer : ${contractTitle}`,
    html,
  })
}
