import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendInvoiceEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: true,
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    switch (action) {
      case "duplicate":
        return await duplicateInvoice(invoice)

      case "markAsSent":
        return await markAsSent(invoice)

      case "markAsPaid":
        return await markAsPaid(invoice, body)

      case "sendEmail":
        return await sendEmailAction(invoice, body)

      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error processing invoice action:", error)
    return NextResponse.json(
      { error: "Erreur lors du traitement de l'action" },
      { status: 500 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function duplicateInvoice(invoice: any) {
  // Generate new invoice number
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenant_id: BigInt(1) },
    orderBy: { invoiceNumber: "desc" },
  })

  let newNumber = "FAC-001"
  if (lastInvoice?.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/)
    if (match) {
      const num = parseInt(match[1]) + 1
      newNumber = `FAC-${num.toString().padStart(3, "0")}`
    }
  }

  // Create new invoice
  const newInvoice = await prisma.invoice.create({
    data: {
      tenant_id: BigInt(1),
      clientId: invoice.clientId,
      invoiceNumber: newNumber,
      invoice_type: invoice.invoice_type,
      status: "draft",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotalHt: invoice.subtotalHt,
      taxAmount: invoice.taxAmount,
      totalTtc: invoice.totalTtc,
      discount_type: invoice.discount_type,
      discount_value: invoice.discount_value,
      discountAmount: invoice.discountAmount,
      notes: invoice.notes,
      paymentTerms: invoice.paymentTerms,
      publicToken: crypto.randomBytes(32).toString("hex"),
    },
  })

  // Duplicate items
  for (const item of invoice.items) {
    await prisma.invoiceItem.create({
      data: {
        tenant_id: BigInt(1),
        invoiceId: newInvoice.id,
        serviceId: item.serviceId,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceHt: item.unitPriceHt,
        vatRate: item.vatRate,
        totalHt: item.totalHt,
        totalTtc: item.totalTtc,
      },
    })
  }

  return NextResponse.json({
    success: true,
    message: "Facture dupliquée avec succès",
    invoiceId: newInvoice.id.toString(),
    invoiceNumber: newInvoice.invoiceNumber,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markAsSent(invoice: any) {
  // Generate public token if not exists
  const publicToken = invoice.publicToken || crypto.randomBytes(32).toString("hex")

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "sent",
      sentAt: new Date(),
      publicToken,
    },
  })

  return NextResponse.json({
    success: true,
    message: "Facture marquée comme envoyée",
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markAsPaid(invoice: any, body: { paymentDate?: string; paymentMethod?: string; paymentNotes?: string }) {
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "paid",
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMethod: body.paymentMethod || null,
      payment_notes: body.paymentNotes || null,
    },
  })

  return NextResponse.json({
    success: true,
    message: "Facture marquée comme payée",
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendEmailAction(invoice: any, body: { paymentMethod?: string; debitDate?: string; paymentLink?: string }) {
  // Generate public token if not exists
  const publicToken = invoice.publicToken || crypto.randomBytes(32).toString("hex")

  // Get client email
  const clientEmail = invoice.client.contactEmail || invoice.client.email
  if (!clientEmail) {
    return NextResponse.json({
      success: false,
      message: "Ce client n'a pas d'adresse email",
    })
  }

  // Get tenant info for company name
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
    select: { name: true, settings: true },
  })
  const companyName = tenant?.name || "CRM"

  // Format dates
  const invoiceDate = new Date(invoice.issueDate).toLocaleDateString("fr-FR")
  const dueDate = new Date(invoice.dueDate).toLocaleDateString("fr-FR")
  const totalAmount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(Number(invoice.totalTtc))

  // Build public URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.julienronot.fr"
  const viewUrl = `${baseUrl}/client/invoices/${publicToken}`

  // Get logo URL from settings if available
  let logoUrl: string | undefined
  if (tenant?.settings) {
    try {
      const settings = JSON.parse(tenant.settings as string)
      logoUrl = settings.logoUrl || settings.logo_url
    } catch {
      // Ignore parse errors
    }
  }

  // Format debit date if provided
  const debitDate = body.debitDate
    ? new Date(body.debitDate).toLocaleDateString("fr-FR")
    : undefined

  try {
    // Send the actual email using SMTP
    await sendInvoiceEmail(
      clientEmail,
      invoice.client.companyName || invoice.client.contactFirstname || "Client",
      invoice.invoiceNumber,
      invoiceDate,
      dueDate,
      totalAmount,
      viewUrl,
      companyName,
      logoUrl,
      undefined, // message
      body.paymentMethod,
      debitDate
    )

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: invoice.status === "draft" ? "sent" : invoice.status,
        sentAt: invoice.sentAt || new Date(),
        publicToken,
        paymentMethod: body.paymentMethod || invoice.paymentMethod,
      },
    })

    // Save email in Email table for tracking
    await prisma.email.create({
      data: {
        client_id: invoice.clientId,
        subject: `Facture ${invoice.invoiceNumber} - ${companyName}`,
        body: `Facture ${invoice.invoiceNumber} envoyée le ${invoiceDate}. Montant: ${totalAmount}. Échéance: ${dueDate}.`,
        from_email: tenant?.settings ? JSON.parse(tenant.settings as string).smtpFromAddress || "noreply@crm.fr" : "noreply@crm.fr",
        to_email: clientEmail,
        status: "sent",
        sentAt: new Date(),
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Email envoyé à ${clientEmail}`,
      publicUrl: viewUrl,
    })
  } catch (error) {
    console.error("Error sending invoice email:", error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Erreur lors de l'envoi de l'email",
    })
  }
}
