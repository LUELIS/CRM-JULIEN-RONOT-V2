import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const mailOptions = {
    from: process.env.SMTP_FROM || `"CRM Julien" <noreply@crm-julien.fr>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ""),
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
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
  message?: string
) {
  const expirationText = expiresAt
    ? `Ce lien expire le <strong style="color: #0064FA;">${expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.`
    : ""

  const customMessage = message
    ? `<p style="color: #444444; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; padding: 16px; background: #F5F7FA; border-radius: 8px; border-left: 4px solid #0064FA;">${message}</p>`
    : ""

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document à signer</title>
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
                      <span style="font-size: 28px; color: white;">✍️</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 600;">Document à signer</h1>
                    <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">${senderCompany}</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px 40px 40px 40px;">
                    <p style="color: #111111; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                      Bonjour <strong>${signerName}</strong>,
                    </p>
                    <p style="color: #444444; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                      <strong style="color: #0064FA;">${senderName}</strong> de <strong>${senderCompany}</strong> vous invite à signer le document suivant :
                    </p>

                    <div style="padding: 16px 20px; background: #F5F7FA; border-radius: 8px; margin: 0 0 24px 0;">
                      <p style="color: #111111; font-size: 16px; font-weight: 600; margin: 0;">
                        📄 ${contractTitle}
                      </p>
                    </div>

                    ${customMessage}

                    <!-- Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="${signingUrl}" style="display: inline-block; background: #0064FA; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 100, 250, 0.3);">
                            Signer le document
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666666; font-size: 13px; line-height: 1.6; margin: 32px 0 0 0; text-align: center;">
                      ${expirationText}
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background: #F5F5F7; border-top: 1px solid #EEEEEE;">
                    <p style="color: #AEAEAE; font-size: 12px; margin: 0; text-align: center;">
                      © ${new Date().getFullYear()} ${senderCompany}. Tous droits réservés.
                    </p>
                    <p style="color: #AEAEAE; font-size: 11px; margin: 8px 0 0 0; text-align: center;">
                      Ce document utilise la signature électronique sécurisée.
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
