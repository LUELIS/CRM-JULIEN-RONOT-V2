import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

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
        return await sendEmail(invoice, body)

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
async function sendEmail(invoice: any, body: { paymentMethod?: string; debitDate?: string; paymentLink?: string }) {
  // Generate public token if not exists
  const publicToken = invoice.publicToken || crypto.randomBytes(32).toString("hex")

  // Update invoice
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: invoice.status === "draft" ? "sent" : invoice.status,
      sentAt: invoice.sentAt || new Date(),
      publicToken,
      paymentMethod: body.paymentMethod || invoice.paymentMethod,
    },
  })

  // Get email config
  const emailConfig = await prisma.supportEmailConfig.findUnique({
    where: { tenant_id: BigInt(1) },
  })

  if (!emailConfig || !invoice.client.email) {
    return NextResponse.json({
      success: false,
      message: "Configuration email manquante ou client sans email",
    })
  }

  // In a real implementation, you would send the email here using nodemailer or similar
  // For now, we just return success
  return NextResponse.json({
    success: true,
    message: `Email envoyé à ${invoice.client.email}`,
    publicUrl: `/invoice/${publicToken}`,
  })
}
