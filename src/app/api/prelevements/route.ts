import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: List invoices ready for direct debit
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "pending" // pending, exported, executed
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")

    const where: Record<string, unknown> = {
      tenant_id: BigInt(1),
      paymentMethod: { in: ["prelevement", "prelevement_sepa", "debit"] },
      debit_date: { not: null },
    }

    // Filter by status
    if (status === "pending") {
      where.status = { in: ["sent", "viewed", "overdue"] }
    } else if (status === "exported") {
      where.status = "exported_sepa"
    } else if (status === "executed") {
      where.status = "paid"
    }

    // Filter by date range
    if (fromDate || toDate) {
      where.debit_date = {}
      if (fromDate) {
        (where.debit_date as Record<string, unknown>).gte = new Date(fromDate)
      }
      if (toDate) {
        (where.debit_date as Record<string, unknown>).lte = new Date(toDate)
      }
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
            sepaMandate: true,
            sepaMandateDate: true,
            sepaSequenceType: true,
          },
        },
      },
      orderBy: { debit_date: "asc" },
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
      sepaMandate: invoice.client.sepaMandate,
      sepaMandateDate: invoice.client.sepaMandateDate,
      sepaSequenceType: invoice.client.sepaSequenceType || "RCUR",
      amount: Number(invoice.totalTtc),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      debitDate: invoice.debit_date,
      status: invoice.status,
      hasValidSepaInfo: !!(
        invoice.client.iban &&
        invoice.client.bic &&
        invoice.client.sepaMandate &&
        invoice.client.sepaMandateDate
      ),
    }))

    return NextResponse.json({
      invoices: formattedInvoices,
      total: formattedInvoices.length,
      totalAmount: formattedInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    })
  } catch (error) {
    console.error("Error fetching prelevements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des prélèvements" },
      { status: 500 }
    )
  }
}

// POST: Mark invoices as exported
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
          tenant_id: BigInt(1),
        },
        data: {
          status: "exported_sepa",
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, message: `${invoiceIds.length} facture(s) marquée(s) comme exportée(s)` })
    }

    if (action === "mark_paid") {
      await prisma.invoice.updateMany({
        where: {
          id: { in: invoiceIds.map((id: string) => BigInt(id)) },
          tenant_id: BigInt(1),
        },
        data: {
          status: "paid",
          paymentDate: new Date(),
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, message: `${invoiceIds.length} facture(s) marquée(s) comme payée(s)` })
    }

    return NextResponse.json(
      { error: "Action non reconnue" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error updating prelevements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des prélèvements" },
      { status: 500 }
    )
  }
}
