import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: BigInt(id) },
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            bankName: true,
            iban: true,
          },
        },
        invoices: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 })
    }

    return NextResponse.json({
      id: transaction.id.toString(),
      bankAccountId: transaction.bankAccountId.toString(),
      transactionId: transaction.transaction_id,
      externalId: transaction.externalId,
      transactionDate: transaction.transactionDate.toISOString(),
      valueDate: transaction.valueDate?.toISOString() || null,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      type: transaction.type,
      label: transaction.label,
      description: transaction.description,
      counterpartyName: transaction.counterparty_name,
      counterpartyAccount: transaction.counterparty_account,
      reference: transaction.reference,
      category: transaction.category,
      subCategory: transaction.sub_category,
      tags: transaction.tags ? JSON.parse(transaction.tags) : [],
      isReconciled: transaction.isReconciled,
      status: transaction.status,
      balanceAfter: transaction.balance_after ? Number(transaction.balance_after) : null,
      isInternalTransfer: transaction.is_internal_transfer,
      createdAt: transaction.createdAt?.toISOString() || null,
      bankAccount: {
        id: transaction.bankAccount.id.toString(),
        accountName: transaction.bankAccount.accountName,
        bankName: transaction.bankAccount.bankName,
        iban: transaction.bankAccount.iban,
      },
      linkedInvoice: transaction.invoices
        ? {
            id: transaction.invoices.id.toString(),
            invoiceNumber: transaction.invoices.invoiceNumber,
            status: transaction.invoices.status,
            totalTtc: Number(transaction.invoices.totalTtc),
          }
        : null,
    })
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la transaction" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    // Handle actions
    if (body.action) {
      switch (body.action) {
        case "reconcile":
          await prisma.bankTransaction.update({
            where: { id: BigInt(id) },
            data: { isReconciled: true },
          })
          return NextResponse.json({ success: true })

        case "unreconcile":
          await prisma.bankTransaction.update({
            where: { id: BigInt(id) },
            data: { isReconciled: false },
          })
          return NextResponse.json({ success: true })

        case "linkInvoice":
          if (!body.invoiceId) {
            return NextResponse.json({ error: "ID facture requis" }, { status: 400 })
          }
          await prisma.bankTransaction.update({
            where: { id: BigInt(id) },
            data: {
              invoice_id: BigInt(body.invoiceId),
              isReconciled: true,
            },
          })
          return NextResponse.json({ success: true })

        case "unlinkInvoice":
          await prisma.bankTransaction.update({
            where: { id: BigInt(id) },
            data: { invoice_id: null },
          })
          return NextResponse.json({ success: true })

        case "categorize":
          await prisma.bankTransaction.update({
            where: { id: BigInt(id) },
            data: {
              category: body.category || null,
              sub_category: body.subCategory || null,
            },
          })
          return NextResponse.json({ success: true })

        default:
          return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
      }
    }

    // Regular update
    const {
      label,
      description,
      counterpartyName,
      reference,
      category,
      subCategory,
      tags,
    } = body

    await prisma.bankTransaction.update({
      where: { id: BigInt(id) },
      data: {
        label,
        description,
        counterparty_name: counterpartyName,
        reference,
        category,
        sub_category: subCategory,
        tags: tags ? JSON.stringify(tags) : null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating transaction:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la transaction" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get transaction to update account balance
    const transaction = await prisma.bankTransaction.findUnique({
      where: { id: BigInt(id) },
      include: { bankAccount: true },
    })

    if (!transaction) {
      return NextResponse.json({ error: "Transaction non trouvée" }, { status: 404 })
    }

    // Reverse the balance change
    const newBalance = Number(transaction.bankAccount.currentBalance) - Number(transaction.amount)

    await prisma.$transaction([
      prisma.bankTransaction.delete({
        where: { id: BigInt(id) },
      }),
      prisma.bankAccount.update({
        where: { id: transaction.bankAccountId },
        data: {
          currentBalance: newBalance,
          availableBalance: newBalance,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la transaction" },
      { status: 500 }
    )
  }
}
