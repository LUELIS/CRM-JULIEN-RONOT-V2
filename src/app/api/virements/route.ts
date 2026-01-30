import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { invoices_invoice_type, InvoiceType } from "@/generated/prisma/client"

const TENANT_ID = BigInt(1)

// GET: List credit notes (avoirs) ready for SEPA transfer
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "pending" // pending, exported, executed

    const where: Record<string, unknown> = {
      tenant_id: TENANT_ID,
      // Credit notes have invoice_type = 'credit_note' or type = 'credit_note'
      OR: [
        { invoice_type: invoices_invoice_type.credit_note },
        { type: InvoiceType.credit_note },
      ],
    }

    // Filter by status
    if (status === "pending") {
      where.status = { in: ["draft", "sent"] }
    } else if (status === "exported") {
      where.status = "exported_virement"
    } else if (status === "executed") {
      where.status = "refunded"
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            iban: true,
            bic: true,
          },
        },
        originalInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Format the response
    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice.id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId.toString(),
      clientName: invoice.client.companyName,
      clientEmail: invoice.client.email,
      clientIban: invoice.client.iban,
      clientBic: invoice.client.bic,
      // Credit notes have negative amounts, we show the absolute value
      amount: Math.abs(Number(invoice.totalTtc)),
      issueDate: invoice.issueDate,
      status: invoice.status,
      originalInvoiceId: invoice.originalInvoice?.id.toString() || null,
      originalInvoiceNumber: invoice.originalInvoice?.invoiceNumber || null,
      hasValidSepaInfo: !!(
        invoice.client.iban &&
        invoice.client.bic
      ),
    }))

    return NextResponse.json({
      invoices: formattedInvoices,
      total: formattedInvoices.length,
      totalAmount: formattedInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    })
  } catch (error) {
    console.error("Error fetching virements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des virements" },
      { status: 500 }
    )
  }
}

// POST: Mark invoices as exported or executed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceIds, action } = body

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "Aucune facture sélectionnée" },
        { status: 400 }
      )
    }

    if (action === "mark_exported") {
      await prisma.invoice.updateMany({
        where: {
          id: { in: invoiceIds.map((id: string) => BigInt(id)) },
          tenant_id: TENANT_ID,
        },
        data: {
          status: "exported_virement",
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, message: `${invoiceIds.length} avoir(s) marqué(s) comme exporté(s)` })
    }

    if (action === "mark_refunded") {
      await prisma.invoice.updateMany({
        where: {
          id: { in: invoiceIds.map((id: string) => BigInt(id)) },
          tenant_id: TENANT_ID,
        },
        data: {
          status: "refunded",
          paymentDate: new Date(),
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, message: `${invoiceIds.length} avoir(s) marqué(s) comme remboursé(s)` })
    }

    return NextResponse.json(
      { error: "Action non reconnue" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error updating virements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des virements" },
      { status: 500 }
    )
  }
}
