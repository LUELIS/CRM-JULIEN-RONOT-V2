import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEFAULT_TENANT_ID = BigInt(1)

// Get Revolut settings from tenant
async function getRevolutSettings() {
  const tenant = await prisma.tenants.findFirst({ where: { id: DEFAULT_TENANT_ID } })
  if (!tenant?.settings) return null

  try {
    const settings = JSON.parse(tenant.settings)
    if (!settings.revolutEnabled) return null

    return {
      apiKey: settings.revolutApiKey,
      environment: settings.revolutEnvironment || "sandbox",
    }
  } catch {
    return null
  }
}

// POST: Create a payment link for an invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, amount, currency = "EUR", description } = body

    if (!invoiceId || !amount) {
      return NextResponse.json(
        { error: "invoiceId et amount sont requis" },
        { status: 400 }
      )
    }

    // Get Revolut settings
    const settings = await getRevolutSettings()
    if (!settings) {
      return NextResponse.json(
        { error: "Revolut n'est pas configuré. Allez dans Settings > Intégrations > Revolut." },
        { status: 400 }
      )
    }

    // Get invoice details
    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(invoiceId) },
      include: { client: true },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Create payment link via Revolut API
    const baseUrl = settings.environment === "production"
      ? "https://b2b.revolut.com/api/1.0"
      : "https://sandbox-b2b.revolut.com/api/1.0"

    const paymentLinkData = {
      amount: Math.round(amount * 100), // Revolut uses cents
      currency: currency,
      description: description || `Facture ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      customer: {
        email: invoice.client.email || undefined,
        name: invoice.client.companyName || `${invoice.client.contactFirstname} ${invoice.client.contactLastname}`.trim() || undefined,
      },
      // Payment will expire in 30 days
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    console.log("[Revolut] Creating payment link:", {
      invoiceNumber: invoice.invoiceNumber,
      amount: paymentLinkData.amount,
      currency: paymentLinkData.currency,
      environment: settings.environment,
    })

    const response = await fetch(`${baseUrl}/payment-links`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentLinkData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[Revolut] API error:", response.status, errorData)
      return NextResponse.json(
        { error: errorData.message || `Erreur Revolut: ${response.status}` },
        { status: response.status }
      )
    }

    const paymentLink = await response.json()
    console.log("[Revolut] Payment link created:", paymentLink.id)

    // Update invoice with payment link info
    await prisma.invoice.update({
      where: { id: BigInt(invoiceId) },
      data: {
        payment_link: paymentLink.checkout_url || paymentLink.url,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      paymentLink: paymentLink.checkout_url || paymentLink.url,
      paymentLinkId: paymentLink.id,
      expiresAt: paymentLink.expires_at,
    })
  } catch (error) {
    console.error("[Revolut] Error creating payment link:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du lien de paiement" },
      { status: 500 }
    )
  }
}
