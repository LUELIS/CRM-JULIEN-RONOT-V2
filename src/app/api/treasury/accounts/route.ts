import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const accounts = await prisma.bankAccount.findMany({
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
    })

    // Calculate monthly stats
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyStats = await prisma.bankTransaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
      where: {
        transactionDate: { gte: startOfMonth },
        status: "completed",
      },
    })

    const totalBalance = accounts.reduce(
      (sum, acc) => sum + Number(acc.currentBalance),
      0
    )
    const availableBalance = accounts.reduce(
      (sum, acc) => sum + Number(acc.availableBalance),
      0
    )

    const monthlyIncome = monthlyStats.find((s) => s.type === "credit")?._sum.amount || 0
    const monthlyExpenses = Math.abs(Number(monthlyStats.find((s) => s.type === "debit")?._sum.amount || 0))

    const serializedAccounts = accounts.map((account) => ({
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
      transactionCount: account._count.transactions,
    }))

    return NextResponse.json({
      accounts: serializedAccounts,
      stats: {
        totalBalance,
        availableBalance,
        accountCount: accounts.length,
        activeCount: accounts.filter((a) => a.status === "active").length,
        monthlyIncome: Number(monthlyIncome),
        monthlyExpenses,
        netCashFlow: Number(monthlyIncome) - monthlyExpenses,
      },
    })
  } catch (error) {
    console.error("Error fetching bank accounts:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des comptes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bankName,
      accountName,
      accountNumber,
      iban,
      bic,
      accountType,
      currentBalance,
      currency,
      isPrimary,
    } = body

    if (!bankName || !accountName) {
      return NextResponse.json(
        { error: "Le nom de la banque et du compte sont requis" },
        { status: 400 }
      )
    }

    // If this is set as primary, unset other primary accounts
    if (isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      })
    }

    // Get max display order
    const maxOrder = await prisma.bankAccount.aggregate({
      _max: { displayOrder: true },
    })

    const account = await prisma.bankAccount.create({
      data: {
        tenant_id: BigInt(1),
        bankName,
        accountName,
        accountNumber,
        iban,
        bic,
        accountType: accountType || "checking",
        currentBalance: currentBalance || 0,
        availableBalance: currentBalance || 0,
        currency: currency || "EUR",
        status: "active",
        isPrimary: isPrimary || false,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
      },
    })

    return NextResponse.json({
      id: account.id.toString(),
      accountName: account.accountName,
    })
  } catch (error) {
    console.error("Error creating bank account:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
