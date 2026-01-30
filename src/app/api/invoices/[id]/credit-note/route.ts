import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"
import { invoices_invoice_type, InvoiceType } from "@/generated/prisma/client"

const TENANT_ID = BigInt(1)

// POST - Create a credit note (avoir) from an invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { reason, partialAmount } = body

    // Get the original invoice
    const originalInvoice = await prisma.invoice.findFirst({
      where: {
        id: BigInt(id),
        tenant_id: TENANT_ID,
      },
      include: {
        items: true,
        client: true,
      },
    })

    if (!originalInvoice) {
      return NextResponse.json(
        { error: "Facture non trouvée" },
        { status: 404 }
      )
    }

    // Check if invoice can have a credit note
    if (originalInvoice.status === "draft" || originalInvoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Impossible de créer un avoir pour une facture en brouillon ou annulée" },
        { status: 400 }
      )
    }

    // Generate credit note number (AVR-YYYY-XXXXX)
    const lastCreditNote = await prisma.invoice.findFirst({
      where: {
        tenant_id: TENANT_ID,
        invoice_type: invoices_invoice_type.credit_note,
      },
      orderBy: { id: "desc" },
      select: { invoiceNumber: true },
    })

    let nextNumber = 1
    if (lastCreditNote?.invoiceNumber) {
      const match = lastCreditNote.invoiceNumber.match(/(\d+)$/)
      if (match) nextNumber = parseInt(match[1]) + 1
    }

    const creditNoteNumber = `AVR-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`
    const publicToken = randomBytes(32).toString("hex")

    // Calculate amounts (negative for credit note)
    let subtotalHt: number
    let taxAmount: number
    let totalTtc: number

    if (partialAmount !== undefined && partialAmount > 0) {
      // Partial credit note - calculate proportionally
      const ratio = partialAmount / Number(originalInvoice.totalTtc)
      subtotalHt = -Math.abs(Number(originalInvoice.subtotalHt) * ratio)
      taxAmount = -Math.abs(Number(originalInvoice.taxAmount) * ratio)
      totalTtc = -Math.abs(partialAmount)
    } else {
      // Full credit note
      subtotalHt = -Math.abs(Number(originalInvoice.subtotalHt))
      taxAmount = -Math.abs(Number(originalInvoice.taxAmount))
      totalTtc = -Math.abs(Number(originalInvoice.totalTtc))
    }

    // Create the credit note
    const creditNote = await prisma.invoice.create({
      data: {
        tenant_id: TENANT_ID,
        publicToken,
        invoiceNumber: creditNoteNumber,
        invoice_type: invoices_invoice_type.credit_note,
        type: InvoiceType.credit_note,
        original_invoice_id: originalInvoice.id,
        clientId: originalInvoice.clientId,
        status: "draft",
        issueDate: new Date(),
        dueDate: new Date(),
        subtotalHt: subtotalHt,
        taxAmount: taxAmount,
        totalTtc: totalTtc,
        notes: reason
          ? `Avoir sur facture ${originalInvoice.invoiceNumber}\nMotif: ${reason}`
          : `Avoir sur facture ${originalInvoice.invoiceNumber}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Create credit note items (negative quantities or amounts)
    if (partialAmount === undefined || partialAmount <= 0) {
      // Full credit note - copy all items with negative amounts
      for (const item of originalInvoice.items) {
        await prisma.invoiceItem.create({
          data: {
            tenant_id: TENANT_ID,
            invoiceId: creditNote.id,
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceHt: -Math.abs(Number(item.unitPriceHt)),
            vatRate: item.vatRate,
            taxAmount: -Math.abs(Number(item.taxAmount)),
            totalHt: -Math.abs(Number(item.totalHt)),
            totalTtc: -Math.abs(Number(item.totalTtc)),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }
    } else {
      // Partial credit note - single line item
      const avgVatRate = Number(originalInvoice.taxAmount) / Number(originalInvoice.subtotalHt) * 100 || 20
      await prisma.invoiceItem.create({
        data: {
          tenant_id: TENANT_ID,
          invoiceId: creditNote.id,
          description: `Avoir partiel sur facture ${originalInvoice.invoiceNumber}`,
          quantity: 1,
          unit: "forfait",
          unitPriceHt: subtotalHt,
          vatRate: avgVatRate,
          taxAmount: taxAmount,
          totalHt: subtotalHt,
          totalTtc: totalTtc,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      creditNote: {
        id: creditNote.id.toString(),
        invoiceNumber: creditNote.invoiceNumber,
        totalTtc: Number(creditNote.totalTtc),
      },
      message: `Avoir ${creditNoteNumber} créé avec succès`,
    })
  } catch (error) {
    console.error("Error creating credit note:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'avoir" },
      { status: 500 }
    )
  }
}
