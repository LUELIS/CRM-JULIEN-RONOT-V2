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
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px; background-color: #F0F4FF; border-left: 4px solid #0064FA;">
            <p style="color: #1a1a1a; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">"${message}"</p>
          </td>
        </tr>
      </table>`
    : ""

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${senderCompany}" style="max-height: 50px; max-width: 200px; margin-bottom: 16px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
        <tr>
          <td width="64" height="64" align="center" valign="middle" bgcolor="#7B2FD0" style="font-size: 32px;">
            &#9997;&#65039;
          </td>
        </tr>
      </table>`

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Document à signer - ${contractTitle}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
          .button-link {background-color: #0064FA !important; padding: 18px 56px !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px;">

                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#5F00BA" style="padding: 48px 40px 32px 40px;">
                    ${logoSection}
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: bold;">
                      Document à signer
                    </h1>
                    <p style="color: #E8D5FF; font-size: 15px; margin: 0;">
                      ${senderCompany}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: bold;">
                      Bonjour ${signerName},
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      <strong style="color: #5F00BA;">${senderName}</strong> vous invite à signer un document électroniquement.
                    </p>

                    <!-- Document Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                      <tr>
                        <td bgcolor="#f0f4ff" style="padding: 24px; border-left: 5px solid #0064FA;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="56" valign="top">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                  <tr>
                                    <td width="56" height="56" align="center" valign="middle" bgcolor="#e8f0ff" style="font-size: 28px;">
                                      &#128196;
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td style="padding-left: 20px;" valign="middle">
                                <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                                  Document
                                </p>
                                <p style="margin: 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">
                                  ${contractTitle}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${customMessage}

                    <!-- CTA Button - Outlook compatible -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${signingUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="22%" stroke="f" fillcolor="#0064FA">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">&#9997; Signer le document</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${signingUrl}" style="display: inline-block; background-color: #0064FA; color: #ffffff; text-decoration: none; padding: 18px 56px; font-size: 17px; font-weight: bold; border-radius: 12px; mso-hide: all;">
                            &#9997;&#65039;&nbsp;&nbsp;Signer le document
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link for older clients -->
                    <p style="text-align: center; margin: 0 0 28px 0;">
                      <span style="color: #6b7280; font-size: 12px;">Lien direct : </span>
                      <a href="${signingUrl}" style="color: #0064FA; font-size: 12px; word-break: break-all;">${signingUrl}</a>
                    </p>

                    ${expirationDate ? `
                    <!-- Expiration Notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                      <tr>
                        <td bgcolor="#fff8e6" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#9200;
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
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px;">
                      <tr>
                        <td bgcolor="#fafafa" style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 15px; font-weight: bold;">
                            Comment signer :
                          </p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #0064FA;">1.</strong> Cliquez sur le bouton "Signer le document"
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #0064FA;">2.</strong> Vérifiez les informations du document
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #0064FA;">3.</strong> Apposez votre signature électronique
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #4a4a4a; font-size: 14px;">
                                <strong style="color: #10b981;">&#10003;</strong> Validez pour finaliser
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Badge -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td bgcolor="#f0fdf4" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#128274;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                                  <strong>Signature sécurisée</strong><br />
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
                  <td bgcolor="#f8f9fc" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
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
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                  <td style="padding: 24px 0;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${senderCompany} - Signature électronique sécurisée
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
    subject: `Document à signer : ${contractTitle}`,
    html,
  })
}

/**
 * Send invoice email to client
 */
export async function sendInvoiceEmail(
  email: string,
  clientName: string,
  invoiceNumber: string,
  invoiceDate: string,
  dueDate: string,
  totalAmount: string,
  viewUrl: string,
  senderCompany: string,
  logoUrl?: string,
  message?: string
) {
  const customMessage = message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px; background-color: #F0F4FF; border-left: 4px solid #0064FA;">
            <p style="color: #1a1a1a; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">"${message}"</p>
          </td>
        </tr>
      </table>`
    : ""

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${senderCompany}" style="max-height: 50px; max-width: 200px; margin-bottom: 16px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
        <tr>
          <td width="64" height="64" align="center" valign="middle" bgcolor="#0064FA" style="font-size: 32px; color: white;">
            &#128195;
          </td>
        </tr>
      </table>`

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Facture ${invoiceNumber}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px;">

                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#0064FA" style="padding: 48px 40px 32px 40px;">
                    ${logoSection}
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: bold;">
                      Nouvelle facture
                    </h1>
                    <p style="color: #B8D4FF; font-size: 15px; margin: 0;">
                      ${senderCompany}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: bold;">
                      Bonjour ${clientName},
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      Veuillez trouver ci-dessous votre facture. Vous pouvez la consulter et la télécharger en cliquant sur le bouton ci-dessous.
                    </p>

                    <!-- Invoice Details Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td bgcolor="#f8f9fc" style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Numéro</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">${invoiceNumber}</p>
                              </td>
                              <td width="50%" align="right">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Date</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px;">${invoiceDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Échéance</p>
                                <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 16px; font-weight: bold;">${dueDate}</p>
                              </td>
                              <td width="50%" align="right">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Montant TTC</p>
                                <p style="margin: 4px 0 0 0; color: #0064FA; font-size: 24px; font-weight: bold;">${totalAmount}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${customMessage}

                    <!-- CTA Button - Outlook compatible -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${viewUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="22%" stroke="f" fillcolor="#0064FA">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">&#128195; Voir ma facture</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${viewUrl}" style="display: inline-block; background-color: #0064FA; color: #ffffff; text-decoration: none; padding: 18px 56px; font-size: 17px; font-weight: bold; border-radius: 12px; mso-hide: all;">
                            &#128195;&nbsp;&nbsp;Voir ma facture
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link -->
                    <p style="text-align: center; margin: 0 0 28px 0;">
                      <span style="color: #6b7280; font-size: 12px;">Lien direct : </span>
                      <a href="${viewUrl}" style="color: #0064FA; font-size: 12px; word-break: break-all;">${viewUrl}</a>
                    </p>

                    <!-- Payment Info -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td bgcolor="#fff8e6" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#128176;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #92600e; font-size: 14px; line-height: 1.5;">
                                  <strong>Modes de paiement acceptés :</strong> Virement bancaire, carte bancaire<br />
                                  <span style="color: #b8860b;">Les coordonnées bancaires sont disponibles sur la facture.</span>
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
                  <td bgcolor="#f8f9fc" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                      Ce message a été envoyé par <strong>${senderCompany}</strong>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      Pour toute question concernant cette facture, n'hésitez pas à nous contacter.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Sub-footer -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                  <td style="padding: 24px 0;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${senderCompany} - Tous droits réservés
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
    subject: `Facture ${invoiceNumber} - ${senderCompany}`,
    html,
  })
}

/**
 * Send quote email to client
 */
export async function sendQuoteEmail(
  email: string,
  clientName: string,
  quoteNumber: string,
  quoteDate: string,
  validUntil: string,
  totalAmount: string,
  viewUrl: string,
  senderCompany: string,
  logoUrl?: string,
  message?: string
) {
  const customMessage = message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
        <tr>
          <td style="padding: 16px 20px; background-color: #F5F0FF; border-left: 4px solid #7B2FD0;">
            <p style="color: #1a1a1a; font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">"${message}"</p>
          </td>
        </tr>
      </table>`
    : ""

  const logoSection = logoUrl
    ? `<img src="${logoUrl}" alt="${senderCompany}" style="max-height: 50px; max-width: 200px; margin-bottom: 16px;" />`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 16px auto;">
        <tr>
          <td width="64" height="64" align="center" valign="middle" bgcolor="#7B2FD0" style="font-size: 32px; color: white;">
            &#128221;
          </td>
        </tr>
      </table>`

  const html = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Devis ${quoteNumber}</title>
        <!--[if mso]>
        <style type="text/css">
          body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px;">

                <!-- Header -->
                <tr>
                  <td align="center" bgcolor="#7B2FD0" style="padding: 48px 40px 32px 40px;">
                    ${logoSection}
                    <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: bold;">
                      Nouveau devis
                    </h1>
                    <p style="color: #DBC4FF; font-size: 15px; margin: 0;">
                      ${senderCompany}
                    </p>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px;">
                    <!-- Greeting -->
                    <p style="color: #1a1a1a; font-size: 18px; line-height: 1.5; margin: 0 0 20px 0; font-weight: bold;">
                      Bonjour ${clientName},
                    </p>

                    <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
                      Suite à notre échange, veuillez trouver ci-dessous notre proposition commerciale. Vous pouvez la consulter et l'accepter en ligne.
                    </p>

                    <!-- Quote Details Card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td bgcolor="#f8f5ff" style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Numéro</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px; font-weight: bold;">${quoteNumber}</p>
                              </td>
                              <td width="50%" align="right">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Date</p>
                                <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 16px;">${quoteDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="50%">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Valide jusqu'au</p>
                                <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 16px; font-weight: bold;">${validUntil}</p>
                              </td>
                              <td width="50%" align="right">
                                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Montant TTC</p>
                                <p style="margin: 4px 0 0 0; color: #7B2FD0; font-size: 24px; font-weight: bold;">${totalAmount}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${customMessage}

                    <!-- CTA Button - Outlook compatible -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${viewUrl}" style="height:54px;v-text-anchor:middle;width:280px;" arcsize="22%" stroke="f" fillcolor="#7B2FD0">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">&#128221; Voir mon devis</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${viewUrl}" style="display: inline-block; background-color: #7B2FD0; color: #ffffff; text-decoration: none; padding: 18px 56px; font-size: 17px; font-weight: bold; border-radius: 12px; mso-hide: all;">
                            &#128221;&nbsp;&nbsp;Voir mon devis
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback link -->
                    <p style="text-align: center; margin: 0 0 28px 0;">
                      <span style="color: #6b7280; font-size: 12px;">Lien direct : </span>
                      <a href="${viewUrl}" style="color: #7B2FD0; font-size: 12px; word-break: break-all;">${viewUrl}</a>
                    </p>

                    <!-- Validity Notice -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px;">
                      <tr>
                        <td bgcolor="#f0fdf4" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#10003;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                                  <strong>Acceptation en ligne</strong><br />
                                  <span style="color: #15803d;">Vous pouvez accepter ce devis directement depuis votre espace client en quelques clics.</span>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Questions -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                      <tr>
                        <td bgcolor="#f5f5f5" style="padding: 18px 22px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="28" valign="top" style="font-size: 20px;">
                                &#128172;
                              </td>
                              <td style="padding-left: 14px;">
                                <p style="margin: 0; color: #4a4a4a; font-size: 14px; line-height: 1.5;">
                                  <strong>Des questions ?</strong><br />
                                  <span style="color: #6b7280;">N'hésitez pas à nous contacter pour toute précision ou modification.</span>
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
                  <td bgcolor="#f8f9fc" style="padding: 24px 40px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
                      Ce message a été envoyé par <strong>${senderCompany}</strong>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                      Nous restons à votre disposition pour toute information complémentaire.
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Sub-footer -->
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                <tr>
                  <td style="padding: 24px 0;">
                    <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${senderCompany} - Tous droits réservés
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
    subject: `Devis ${quoteNumber} - ${senderCompany}`,
    html,
  })
}
