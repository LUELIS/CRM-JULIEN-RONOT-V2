import { NextRequest, NextResponse } from "next/server"
import {
  sendEmail,
  sendPasswordResetEmail,
  sendClientInvitationEmail,
  sendSignatureRequestEmail,
  sendInvoiceEmail,
  sendQuoteEmail,
} from "@/lib/email"
import { prisma } from "@/lib/prisma"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email address required" },
        { status: 400 }
      )
    }

    // Get tenant info
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
      select: { name: true, settings: true },
    })
    const companyName = tenant?.name || "Luelis"

    // Get logo URL
    let logoUrl: string | undefined
    if (tenant?.settings) {
      try {
        const settings = JSON.parse(tenant.settings as string)
        logoUrl = settings.logoUrl || settings.logo_url
      } catch {
        // Ignore
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.julienronot.fr"
    const results: { type: string; success: boolean; error?: string }[] = []

    // 1. Email Facture - Virement bancaire
    try {
      await sendInvoiceEmail(
        email,
        "Julien (Test)",
        "FAC-2026-0001",
        new Date().toLocaleDateString("fr-FR"),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        formatCurrency(1500.00),
        `${baseUrl}/client/invoices/test-token-virement`,
        companyName,
        logoUrl,
        undefined,
        "Virement bancaire",
        undefined
      )
      results.push({ type: "Facture - Virement bancaire", success: true })
    } catch (e) {
      results.push({ type: "Facture - Virement bancaire", success: false, error: (e as Error).message })
    }

    // 2. Email Facture - Prélèvement automatique
    try {
      await sendInvoiceEmail(
        email,
        "Julien (Test)",
        "FAC-2026-0002",
        new Date().toLocaleDateString("fr-FR"),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        formatCurrency(250.00),
        `${baseUrl}/client/invoices/test-token-prelevement`,
        companyName,
        logoUrl,
        undefined,
        "Prélèvement automatique",
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")
      )
      results.push({ type: "Facture - Prélèvement automatique", success: true })
    } catch (e) {
      results.push({ type: "Facture - Prélèvement automatique", success: false, error: (e as Error).message })
    }

    // 3. Email Facture - Carte bancaire
    try {
      await sendInvoiceEmail(
        email,
        "Julien (Test)",
        "FAC-2026-0003",
        new Date().toLocaleDateString("fr-FR"),
        new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        formatCurrency(899.00),
        `${baseUrl}/client/invoices/test-token-cb`,
        companyName,
        logoUrl,
        undefined,
        "Carte bancaire",
        undefined
      )
      results.push({ type: "Facture - Carte bancaire", success: true })
    } catch (e) {
      results.push({ type: "Facture - Carte bancaire", success: false, error: (e as Error).message })
    }

    // 4. Email Devis
    try {
      await sendQuoteEmail(
        email,
        "Julien (Test)",
        "DEV-2026-0001",
        new Date().toLocaleDateString("fr-FR"),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR"),
        formatCurrency(5000.00),
        `${baseUrl}/client/quotes/test-token-devis`,
        companyName,
        logoUrl,
        undefined
      )
      results.push({ type: "Devis", success: true })
    } catch (e) {
      results.push({ type: "Devis", success: false, error: (e as Error).message })
    }

    // 5. Email Invitation client
    try {
      await sendClientInvitationEmail(
        email,
        "test-invitation-token",
        "Julien Ronot",
        companyName
      )
      results.push({ type: "Invitation client", success: true })
    } catch (e) {
      results.push({ type: "Invitation client", success: false, error: (e as Error).message })
    }

    // 6. Email Demande de signature
    try {
      await sendSignatureRequestEmail(
        email,
        "Julien (Test)",
        `${baseUrl}/client/sign/test-token-signature`,
        "Contrat de maintenance annuel",
        "Julien Ronot",
        companyName,
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        "Merci de bien vouloir signer ce contrat pour activer votre abonnement.",
        logoUrl
      )
      results.push({ type: "Demande de signature", success: true })
    } catch (e) {
      results.push({ type: "Demande de signature", success: false, error: (e as Error).message })
    }

    // 7. Email Réinitialisation mot de passe
    try {
      await sendPasswordResetEmail(
        email,
        "test-reset-token",
        "Julien"
      )
      results.push({ type: "Réinitialisation mot de passe", success: true })
    } catch (e) {
      results.push({ type: "Réinitialisation mot de passe", success: false, error: (e as Error).message })
    }

    // 8. Email Relance facture impayée
    try {
      const overdueHtml = `
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
              <div style="background: linear-gradient(135deg, #DC2626 0%, #F97316 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                  Rappel de Paiement
                </h1>
              </div>

              <!-- Content -->
              <div style="padding: 30px;">
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Bonjour,
                </p>
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Votre facture FAC-TEST-001 de ${formatCurrency(750)} est en retard de 7 jours.
                </p>

                <!-- Invoice Summary -->
                <div style="background: #F5F5F5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #DC2626;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: #666; padding: 8px 0;">Numéro de facture</td>
                      <td style="color: #333; font-weight: 600; text-align: right;">FAC-TEST-001</td>
                    </tr>
                    <tr>
                      <td style="color: #666; padding: 8px 0;">Montant TTC</td>
                      <td style="color: #333; font-weight: 600; text-align: right;">${formatCurrency(750)}</td>
                    </tr>
                    <tr>
                      <td style="color: #666; padding: 8px 0;">Échéance</td>
                      <td style="color: #DC2626; font-weight: 600; text-align: right;">
                        ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")} (7j de retard)
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/client/invoices/test-token-relance" style="display: inline-block; background: #DC2626; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    Voir et payer la facture
                  </a>
                </div>

                <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                  Si vous avez déjà effectué le paiement, merci de ne pas tenir compte de ce message.
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #F9F9F9; padding: 20px; text-align: center; border-top: 1px solid #EEE;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  ${companyName} | Cet email a été envoyé automatiquement
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
      await sendEmail({
        to: email,
        subject: `[Rappel] Facture FAC-TEST-001 en retard de paiement - ${companyName}`,
        html: overdueHtml,
      })
      results.push({ type: "Relance facture impayée", success: true })
    } catch (e) {
      results.push({ type: "Relance facture impayée", success: false, error: (e as Error).message })
    }

    // 9. Email Relance facture proche échéance
    try {
      const dueSoonHtml = `
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
                  Échéance Proche
                </h1>
              </div>

              <!-- Content -->
              <div style="padding: 30px;">
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Bonjour,
                </p>
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                  Votre facture FAC-TEST-002 de ${formatCurrency(1200)} arrive à échéance le ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}.
                </p>

                <!-- Invoice Summary -->
                <div style="background: #F5F5F5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #0064FA;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: #666; padding: 8px 0;">Numéro de facture</td>
                      <td style="color: #333; font-weight: 600; text-align: right;">FAC-TEST-002</td>
                    </tr>
                    <tr>
                      <td style="color: #666; padding: 8px 0;">Montant TTC</td>
                      <td style="color: #333; font-weight: 600; text-align: right;">${formatCurrency(1200)}</td>
                    </tr>
                    <tr>
                      <td style="color: #666; padding: 8px 0;">Échéance</td>
                      <td style="color: #333; font-weight: 600; text-align: right;">
                        ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/client/invoices/test-token-due-soon" style="display: inline-block; background: #0064FA; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    Voir et payer la facture
                  </a>
                </div>

                <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                  Si vous avez déjà effectué le paiement, merci de ne pas tenir compte de ce message.
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #F9F9F9; padding: 20px; text-align: center; border-top: 1px solid #EEE;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  ${companyName} | Cet email a été envoyé automatiquement
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
      await sendEmail({
        to: email,
        subject: `Rappel: Facture FAC-TEST-002 arrive à échéance - ${companyName}`,
        html: dueSoonHtml,
      })
      results.push({ type: "Relance facture proche échéance", success: true })
    } catch (e) {
      results.push({ type: "Relance facture proche échéance", success: false, error: (e as Error).message })
    }

    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      message: `${successCount}/${results.length} emails envoyés avec succès à ${email}`,
      results,
    })
  } catch (error) {
    console.error("Error sending test emails:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'envoi des emails" },
      { status: 500 }
    )
  }
}
