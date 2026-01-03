import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: Get unreconciled bank transactions with suggestions for this invoice
// Now supports BATCH reconciliation: transactions can be partially reconciled
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the invoice to know the amount to match
    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        invoiceNumber: true,
        totalTtc: true,
        client: {
          select: {
            companyName: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoiceAmount = Number(invoice.totalTtc)

    // Get credit transactions that have remaining amount to reconcile
    // This includes: fully unreconciled AND partially reconciled transactions
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        tenant_id: BigInt(1),
        type: "credit", // Only credits (incoming payments)
        amount: { gt: 0 },
        // Include transactions that are not fully reconciled
        // OR don't have isReconciled set yet (for backwards compat)
        OR: [
          { isReconciled: false },
          { isReconciled: null },
        ],
      },
      orderBy: { transactionDate: "desc" },
      take: 150,
    })

    // Filter to only include transactions with remaining amount
    const transactionsWithRemaining = transactions.filter((tx) => {
      const totalAmount = Number(tx.amount)
      const reconciledAmount = Number(tx.reconciledAmount || 0)
      const remainingAmount = totalAmount - reconciledAmount
      return remainingAmount > 0.01 // At least 1 cent remaining
    })

    // Format and categorize transactions
    const formattedTransactions = transactionsWithRemaining.map((tx) => {
      const totalAmount = Number(tx.amount)
      const reconciledAmount = Number(tx.reconciledAmount || 0)
      const remainingAmount = totalAmount - reconciledAmount
      const isPartiallyReconciled = reconciledAmount > 0

      // Match against REMAINING amount, not total
      const amountDiff = Math.abs(remainingAmount - invoiceAmount)
      const isExactMatch = amountDiff < 0.01
      const isCloseMatch = amountDiff < invoiceAmount * 0.05 // Within 5%

      // Also check if invoice fits within remaining amount (for batch payments)
      const invoiceFitsInRemaining = invoiceAmount <= remainingAmount + 0.01

      return {
        id: tx.id.toString(),
        transactionId: tx.transaction_id,
        date: tx.transactionDate,
        valueDate: tx.valueDate,
        amount: totalAmount,
        remainingAmount, // NEW: montant restant à réconcilier
        reconciledAmount, // NEW: montant déjà réconcilié
        isPartiallyReconciled, // NEW: indique si déjà partiellement réconcilié
        currency: tx.currency,
        label: tx.label,
        description: tx.description,
        counterpartyName: tx.counterparty_name,
        counterpartyAccount: tx.counterparty_account,
        reference: tx.reference,
        // Matching info
        isExactMatch,
        isCloseMatch,
        invoiceFitsInRemaining, // NEW: facture peut être ajoutée à ce batch
        amountDiff,
        matchScore: isExactMatch ? 100 : isCloseMatch ? 80 : invoiceFitsInRemaining ? 60 : 0,
      }
    })

    // Sort: exact matches first, then close matches, then by date
    formattedTransactions.sort((a, b) => {
      if (a.isExactMatch && !b.isExactMatch) return -1
      if (!a.isExactMatch && b.isExactMatch) return 1
      if (a.isCloseMatch && !b.isCloseMatch) return -1
      if (!a.isCloseMatch && b.isCloseMatch) return 1
      if (a.invoiceFitsInRemaining && !b.invoiceFitsInRemaining) return -1
      if (!a.invoiceFitsInRemaining && b.invoiceFitsInRemaining) return 1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    // Separate into suggested and others
    // Include invoiceFitsInRemaining as a valid suggestion for batch payments
    const suggested = formattedTransactions.filter(
      (tx) => tx.isExactMatch || tx.isCloseMatch || tx.invoiceFitsInRemaining
    )
    const others = formattedTransactions.filter(
      (tx) => !tx.isExactMatch && !tx.isCloseMatch && !tx.invoiceFitsInRemaining
    )

    return NextResponse.json({
      invoice: {
        id: invoice.id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        amount: invoiceAmount,
        clientName: invoice.client.companyName,
      },
      suggested,
      others,
      totalUnreconciled: transactionsWithRemaining.length,
    })
  } catch (error) {
    console.error("Error fetching reconcile suggestions:", error)
    return NextResponse.json(
      { error: "Failed to fetch reconcile suggestions" },
      { status: 500 }
    )
  }
}
