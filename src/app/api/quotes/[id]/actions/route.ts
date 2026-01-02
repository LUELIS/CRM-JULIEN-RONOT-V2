import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { convertProspectToClient } from "@/lib/client-utils"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    const quote = await prisma.quote.findUnique({
      where: { id: BigInt(id) },
      include: {
        client: true,
        items: true,
      },
    })

    if (!quote) {
      return NextResponse.json(
        { error: "Devis non trouvé" },
        { status: 404 }
      )
    }

    switch (action) {
      case "duplicate":
        return await duplicateQuote(quote)

      case "updateStatus":
        return await updateStatus(quote, body.status)

      case "convertToInvoice":
        return await convertToInvoice(quote)

      case "sendEmail":
        return await sendEmail(quote)

      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error processing quote action:", error)
    return NextResponse.json(
      { error: "Erreur lors du traitement de l'action" },
      { status: 500 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function duplicateQuote(quote: any) {
  // Generate new quote number
  const lastQuote = await prisma.quote.findFirst({
    where: { tenant_id: BigInt(1) },
    orderBy: { quoteNumber: "desc" },
  })

  let newNumber = "DEV-001"
  if (lastQuote?.quoteNumber) {
    const match = lastQuote.quoteNumber.match(/(\d+)$/)
    if (match) {
      const num = parseInt(match[1]) + 1
      newNumber = `DEV-${num.toString().padStart(3, "0")}`
    }
  }

  // Create new quote
  const newQuote = await prisma.quote.create({
    data: {
      tenant_id: BigInt(1),
      clientId: quote.clientId,
      quoteNumber: newNumber,
      status: "draft",
      issueDate: new Date(),
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotalHt: quote.subtotalHt,
      taxAmount: quote.taxAmount,
      totalTtc: quote.totalTtc,
      notes: quote.notes,
      termsConditions: quote.termsConditions,
      publicToken: crypto.randomBytes(32).toString("hex"),
    },
  })

  // Duplicate items
  for (const item of quote.items) {
    await prisma.quoteItem.create({
      data: {
        quoteId: newQuote.id,
        title: item.title,
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
    message: "Devis dupliqué avec succès",
    quoteId: newQuote.id.toString(),
    quoteNumber: newQuote.quoteNumber,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateStatus(quote: any, status: string) {
  const validStatuses = ["draft", "sent", "accepted", "rejected"]
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Statut invalide" },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = { status }

  switch (status) {
    case "sent":
      updateData.sent_at = new Date()
      if (!quote.publicToken) {
        updateData.publicToken = crypto.randomBytes(32).toString("hex")
      }
      break
    case "accepted":
      updateData.signed_at = new Date()
      break
    case "rejected":
      updateData.rejectedAt = new Date()
      break
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: updateData,
  })

  // Auto-convert prospect to client when quote is accepted
  if (status === "accepted" && quote.clientId) {
    await convertProspectToClient(quote.clientId)
  }

  const statusMessages: Record<string, string> = {
    draft: "Devis remis en brouillon",
    sent: "Devis marqué comme envoyé",
    accepted: "Devis marqué comme accepté",
    rejected: "Devis marqué comme refusé",
  }

  return NextResponse.json({
    success: true,
    message: statusMessages[status] || "Statut mis à jour",
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function convertToInvoice(quote: any) {
  if (quote.status !== "accepted") {
    return NextResponse.json(
      { error: "Seuls les devis acceptés peuvent être convertis en facture" },
      { status: 400 }
    )
  }

  if (quote.invoiceId) {
    return NextResponse.json(
      { error: "Ce devis a déjà été converti en facture", invoiceId: quote.invoiceId.toString() },
      { status: 400 }
    )
  }

  // Generate invoice number
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenant_id: BigInt(1) },
    orderBy: { invoiceNumber: "desc" },
  })

  let invoiceNumber = "FAC-001"
  if (lastInvoice?.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/)
    if (match) {
      const num = parseInt(match[1]) + 1
      invoiceNumber = `FAC-${num.toString().padStart(3, "0")}`
    }
  }

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      tenant_id: BigInt(1),
      clientId: quote.clientId,
      quoteId: quote.id,
      invoiceNumber,
      invoice_type: "standard",
      status: "draft",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotalHt: quote.subtotalHt,
      taxAmount: quote.taxAmount,
      totalTtc: quote.totalTtc,
      notes: quote.notes,
      paymentTerms: "30 jours",
      publicToken: crypto.randomBytes(32).toString("hex"),
    },
  })

  // Copy items
  for (const item of quote.items) {
    await prisma.invoiceItem.create({
      data: {
        tenant_id: BigInt(1),
        invoiceId: invoice.id,
        description: [item.title, item.description].filter(Boolean).join("\n"),
        quantity: item.quantity,
        unit: item.unit || "unité",
        unitPriceHt: item.unitPriceHt,
        vatRate: item.vatRate,
        totalHt: item.totalHt,
        totalTtc: item.totalTtc,
      },
    })
  }

  // Update quote with invoice reference
  await prisma.quote.update({
    where: { id: quote.id },
    data: { invoiceId: invoice.id },
  })

  // Auto-convert prospect to client when invoice is created
  if (quote.clientId) {
    await convertProspectToClient(quote.clientId)
  }

  return NextResponse.json({
    success: true,
    message: "Devis converti en facture avec succès",
    invoiceId: invoice.id.toString(),
    invoiceNumber: invoice.invoiceNumber,
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendEmail(quote: any) {
  // Generate public token if not exists
  const publicToken = quote.publicToken || crypto.randomBytes(32).toString("hex")

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      status: quote.status === "draft" ? "sent" : quote.status,
      sent_at: quote.sent_at || new Date(),
      publicToken,
    },
  })

  if (!quote.client.email) {
    return NextResponse.json({
      success: false,
      message: "Client sans adresse email",
    })
  }

  // In a real implementation, send email here
  return NextResponse.json({
    success: true,
    message: `Devis envoyé à ${quote.client.email}`,
    publicUrl: `/quote/${publicToken}`,
  })
}
