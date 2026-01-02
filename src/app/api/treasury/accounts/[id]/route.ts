import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id: BigInt(id) },
      include: {
        transactions: {
          orderBy: { transactionDate: "desc" },
          take: 50,
        },
        _count: {
          select: { transactions: true },
        },
      },
    })

    if (!account) {
      return NextResponse.json({ error: "Compte non trouvé" }, { status: 404 })
    }

    // Calculate account stats
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyStats = await prisma.bankTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
      where: {
        bankAccountId: BigInt(id),
        transactionDate: { gte: startOfMonth },
        status: "completed",
      },
    })

    const monthlyIncome = Number(monthlyStats.find((s) => s.type === "credit")?._sum.amount || 0)
    const monthlyExpenses = Math.abs(Number(monthlyStats.find((s) => s.type === "debit")?._sum.amount || 0))

    return NextResponse.json({
      id: account.id.toString(),
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      iban: account.iban,
      bic: account.bic,
      accountType: account.accountType,
      currentBalance: Number(account.currentBalance),
      availableBalance: Number(account.availableBalance),
      currency: account.currency,
      status: account.status,
      isPrimary: account.isPrimary,
      displayOrder: account.displayOrder,
      lastSyncAt: account.lastSyncAt?.toISOString() || null,
      syncError: account.syncError,
      createdAt: account.createdAt?.toISOString() || null,
      transactionCount: account._count.transactions,
      stats: {
        monthlyIncome,
        monthlyExpenses,
        netCashFlow: monthlyIncome - monthlyExpenses,
      },
      transactions: account.transactions.map((tx) => ({
        id: tx.id.toString(),
        transactionDate: tx.transactionDate.toISOString(),
        valueDate: tx.valueDate?.toISOString() || null,
        amount: Number(tx.amount),
        type: tx.type,
        label: tx.label,
        description: tx.description,
        counterpartyName: tx.counterparty_name,
        category: tx.category,
        subCategory: tx.sub_category,
        isReconciled: tx.isReconciled,
        status: tx.status,
        balanceAfter: tx.balance_after ? Number(tx.balance_after) : null,
      })),
    })
  } catch (error) {
    console.error("Error fetching bank account:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du compte" },
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
        case "setPrimary":
          await prisma.bankAccount.updateMany({
            where: { isPrimary: true },
            data: { isPrimary: false },
          })
          await prisma.bankAccount.update({
            where: { id: BigInt(id) },
            data: { isPrimary: true },
          })
          return NextResponse.json({ success: true })

        case "activate":
          await prisma.bankAccount.update({
            where: { id: BigInt(id) },
            data: { status: "active" },
          })
          return NextResponse.json({ success: true })

        case "deactivate":
          await prisma.bankAccount.update({
            where: { id: BigInt(id) },
            data: { status: "inactive" },
          })
          return NextResponse.json({ success: true })

        case "updateBalance":
          await prisma.bankAccount.update({
            where: { id: BigInt(id) },
            data: {
              currentBalance: body.balance,
              availableBalance: body.balance,
            },
          })
          return NextResponse.json({ success: true })

        default:
          return NextResponse.json({ error: "Action inconnue" }, { status: 400 })
      }
    }

    // Regular update
    const {
      bankName,
      accountName,
      accountNumber,
      iban,
      bic,
      accountType,
      currency,
      isPrimary,
      displayOrder,
    } = body

    if (isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { isPrimary: true, id: { not: BigInt(id) } },
        data: { isPrimary: false },
      })
    }

    await prisma.bankAccount.update({
      where: { id: BigInt(id) },
      data: {
        bankName,
        accountName,
        accountNumber,
        iban,
        bic,
        accountType,
        currency,
        isPrimary,
        displayOrder,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating bank account:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du compte" },
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
    // Check if account has transactions
    const transactionCount = await prisma.bankTransaction.count({
      where: { bankAccountId: BigInt(id) },
    })

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer un compte avec des transactions" },
        { status: 400 }
      )
    }

    await prisma.bankAccount.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting bank account:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du compte" },
      { status: 500 }
    )
  }
}
