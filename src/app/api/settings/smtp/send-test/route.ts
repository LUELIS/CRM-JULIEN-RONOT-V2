import { NextRequest, NextResponse } from "next/server"
import * as nodemailer from "nodemailer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpEncryption,
      smtpFromAddress,
      smtpFromName,
      testEmail,
    } = body

    if (!smtpHost || !smtpPort || !smtpUser || !testEmail) {
      return NextResponse.json({
        success: false,
        message: "Paramètres SMTP manquants",
      })
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: smtpEncryption === "ssl", // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    })

    // Send test email
    const info = await transporter.sendMail({
      from: `"${smtpFromName || "CRM"}" <${smtpFromAddress || smtpUser}>`,
      to: testEmail,
      subject: "Test de configuration SMTP - CRM",
      text: `Félicitations !\n\nVotre configuration SMTP fonctionne correctement.\n\nCe message a été envoyé depuis votre CRM pour tester la configuration email.\n\nParamètres utilisés:\n- Serveur: ${smtpHost}\n- Port: ${smtpPort}\n- Chiffrement: ${smtpEncryption?.toUpperCase() || "TLS"}\n- Expéditeur: ${smtpFromAddress || smtpUser}\n\nDate du test: ${new Date().toLocaleString("fr-FR")}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B5CF6, #06B6D4); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Configuration SMTP réussie</h1>
          </div>
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #334155; font-size: 16px; margin-top: 0;">
              <strong>Félicitations !</strong> Votre configuration SMTP fonctionne correctement.
            </p>
            <p style="color: #64748b; font-size: 14px;">
              Ce message a été envoyé depuis votre CRM pour tester la configuration email.
            </p>
            <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <h3 style="color: #334155; margin: 0 0 12px 0; font-size: 14px;">Paramètres utilisés :</h3>
              <table style="font-size: 13px; color: #64748b;">
                <tr><td style="padding: 4px 12px 4px 0;"><strong>Serveur:</strong></td><td>${smtpHost}</td></tr>
                <tr><td style="padding: 4px 12px 4px 0;"><strong>Port:</strong></td><td>${smtpPort}</td></tr>
                <tr><td style="padding: 4px 12px 4px 0;"><strong>Chiffrement:</strong></td><td>${smtpEncryption?.toUpperCase() || "TLS"}</td></tr>
                <tr><td style="padding: 4px 12px 4px 0;"><strong>Expéditeur:</strong></td><td>${smtpFromAddress || smtpUser}</td></tr>
              </table>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
              Date du test: ${new Date().toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Email de test envoyé avec succès à ${testEmail}`,
      messageId: info.messageId,
    })
  } catch (error) {
    console.error("SMTP send test error:", error)

    let errorMessage = "Erreur lors de l'envoi de l'email"
    if (error instanceof Error) {
      // Parse common SMTP errors
      if (error.message.includes("ECONNREFUSED")) {
        errorMessage = "Connexion refusée: Vérifiez le serveur et le port SMTP"
      } else if (error.message.includes("EAUTH") || error.message.includes("authentication")) {
        errorMessage = "Erreur d'authentification: Vérifiez le nom d'utilisateur et le mot de passe"
      } else if (error.message.includes("self signed certificate")) {
        errorMessage = "Certificat SSL non reconnu. Essayez avec un autre port ou chiffrement."
      } else if (error.message.includes("ETIMEDOUT")) {
        errorMessage = "Timeout: Le serveur SMTP ne répond pas"
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
    })
  }
}
