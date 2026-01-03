import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { paymentDate, paymentMethod, paymentNotes, bankTransactionId } = body

    // Get invoice to know the amount
    const invoiceData = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      select: { totalTtc: true, tenant_id: true },
    })

    if (!invoiceData) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoiceAmount = Number(invoiceData.totalTtc)

    // Update invoice as paid
    const invoice = await prisma.invoice.update({
      where: { id: BigInt(id) },
      data: {
        status: "paid",
        paymentDate: new Date(paymentDate),
        paymentMethod,
        payment_notes: paymentNotes || null,
      },
    })

    // If a bank transaction is selected, handle BATCH reconciliation
    if (bankTransactionId) {
      // Get the bank transaction
      const transaction = await prisma.bankTransaction.findUnique({
        where: { id: BigInt(bankTransactionId) },
      })

      if (transaction) {
        const transactionAmount = Number(transaction.amount)
        const currentReconciled = Number(transaction.reconciledAmount || 0)
        const newReconciled = currentReconciled + invoiceAmount

        // Check if this reconciliation would exceed the transaction amount
        // Allow small tolerance for rounding
        const isFullyReconciled = newReconciled >= transactionAmount - 0.01

        // Create the reconciliation record (many-to-many link)
        await prisma.invoiceBankReconciliation.create({
          data: {
            tenant_id: invoiceData.tenant_id,
            invoiceId: BigInt(id),
            bankTransactionId: BigInt(bankTransactionId),
            amount: invoiceAmount,
            reconciledAt: new Date(),
            createdAt: new Date(),
          },
        })

        // Update transaction reconciled amount and status
        await prisma.bankTransaction.update({
          where: { id: BigInt(bankTransactionId) },
          data: {
            // Keep backward compat: also set invoice_id for the first invoice
            // (useful for simple queries)
            invoice_id: transaction.invoice_id || BigInt(id),
            reconciledAmount: newReconciled,
            // Only mark fully reconciled when all amount is accounted for
            isReconciled: isFullyReconciled,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      id: invoice.id.toString(),
      reconciled: !!bankTransactionId,
    })
  } catch (error) {
    console.error("Error marking invoice as paid:", error)
    return NextResponse.json(
      { error: "Failed to mark invoice as paid" },
      { status: 500 }
    )
  }
}
