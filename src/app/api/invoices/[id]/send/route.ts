import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendInvoiceEmail } from "@/lib/email"
import crypto from "crypto"

const paymentMethodLabels: Record<string, string> = {
  virement: "Virement bancaire",
  prelevement_sepa: "Prélèvement SEPA",
  prelevement: "Prélèvement SEPA",
  cheque: "Chèque",
  especes: "Espèces",
  carte: "Carte bancaire",
  paypal: "PayPal",
  stripe: "Stripe",
  autre: "Autre",
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { paymentMethod, debitDate, paymentLink } = body

    // Generate public token if not exists
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      select: { publicToken: true },
    })

    const publicToken = existingInvoice?.publicToken || crypto.randomBytes(32).toString("hex")

    // Update invoice with send info
    const invoice = await prisma.invoice.update({
      where: { id: BigInt(id) },
      data: {
        status: "sent",
        sentAt: new Date(),
        paymentMethod,
        debit_date: debitDate ? new Date(debitDate) : null,
        payment_link: paymentLink || null,
        publicToken,
      },
      include: {
        client: {
          select: {
            companyName: true,
            email: true,
            contactEmail: true,
          },
        },
      },
    })

    // Get tenant settings for company info
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
      select: { name: true, settings: true },
    })

    const companyName = tenant?.name || "CRM"
    let logoUrl: string | undefined
    if (tenant?.settings) {
      const settings = JSON.parse(tenant.settings as string)
      logoUrl = settings.logoUrl || settings.logo_url
    }

    // Format dates
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }

    // Format amount
    const formatAmount = (amount: number) => {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(amount)
    }

    // Build view URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.julienronot.fr"
    const viewUrl = `${baseUrl}/invoice/${publicToken}`

    // Get invoice details for email
    const invoiceDetails = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      select: {
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        totalTtc: true,
      },
    })

    if (!invoiceDetails) {
      throw new Error("Invoice not found")
    }

    // Get client email (prefer contactEmail if available)
    const clientEmail = invoice.client.contactEmail || invoice.client.email

    if (!clientEmail) {
      return NextResponse.json({
        success: false,
        error: "Le client n'a pas d'adresse email configurée",
      }, { status: 400 })
    }

    // Send the email
    const paymentMethodLabel = paymentMethodLabels[paymentMethod] || paymentMethod || "Virement bancaire"
    const directDebitDate = debitDate ? formatDate(new Date(debitDate)) : undefined

    await sendInvoiceEmail(
      clientEmail,
      invoice.client.companyName,
      invoiceDetails.invoiceNumber,
      formatDate(invoiceDetails.issueDate),
      formatDate(invoiceDetails.dueDate),
      formatAmount(Number(invoiceDetails.totalTtc)),
      viewUrl,
      companyName,
      logoUrl,
      undefined, // message
      paymentMethodLabel,
      directDebitDate
    )

    return NextResponse.json({
      success: true,
      id: invoice.id.toString(),
      publicToken,
      message: `Facture envoyée à ${clientEmail}`,
    })
  } catch (error) {
    console.error("Error sending invoice:", error)
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"
    return NextResponse.json(
      { error: `Erreur lors de l'envoi: ${errorMessage}` },
      { status: 500 }
    )
  }
}
