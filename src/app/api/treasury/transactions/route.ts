import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("perPage") || "25")
  const search = searchParams.get("search") || ""
  const type = searchParams.get("type") || ""
  const accountId = searchParams.get("accountId") || ""
  const category = searchParams.get("category") || ""
  const startDate = searchParams.get("startDate") || ""
  const endDate = searchParams.get("endDate") || ""
  const reconciled = searchParams.get("reconciled") || ""

  try {
    const where: Prisma.BankTransactionWhereInput = {}

    if (search) {
      where.OR = [
        { label: { contains: search } },
        { description: { contains: search } },
        { counterparty_name: { contains: search } },
        { reference: { contains: search } },
      ]
    }

    if (type && ["credit", "debit"].includes(type)) {
      where.type = type as "credit" | "debit"
    }

    if (accountId) {
      where.bankAccountId = BigInt(accountId)
    }

    if (category) {
      where.category = category
    }

    if (startDate) {
      where.transactionDate = {
        ...((where.transactionDate as object) || {}),
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      where.transactionDate = {
        ...((where.transactionDate as object) || {}),
        lte: new Date(endDate),
      }
    }

    if (reconciled === "true") {
      where.isReconciled = true
    } else if (reconciled === "false") {
      where.isReconciled = false
    }

    const [transactions, total, categories] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        include: {
          bankAccount: {
            select: {
              id: true,
              accountName: true,
              bankName: true,
            },
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
        },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { transactionDate: "desc" },
      }),
      prisma.bankTransaction.count({ where }),
      prisma.bankTransaction.groupBy({
        by: ["category"],
        _count: true,
        _sum: { amount: true },
      }),
    ])

    // Calculate stats
    const stats = await prisma.bankTransaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    })

    const typeStats = await prisma.bankTransaction.groupBy({
      by: ["type"],
      where,
      _sum: { amount: true },
      _count: true,
    })

    const serializedTransactions = transactions.map((tx) => ({
      id: tx.id.toString(),
      bankAccountId: tx.bankAccountId.toString(),
      transactionId: tx.transaction_id,
      externalId: tx.externalId,
      transactionDate: tx.transactionDate.toISOString(),
      valueDate: tx.valueDate?.toISOString() || null,
      amount: Number(tx.amount),
      currency: tx.currency,
      type: tx.type,
      label: tx.label,
      description: tx.description,
      counterpartyName: tx.counterparty_name,
      counterpartyAccount: tx.counterparty_account,
      reference: tx.reference,
      category: tx.category,
      subCategory: tx.sub_category,
      isReconciled: tx.isReconciled,
      status: tx.status,
      balanceAfter: tx.balance_after ? Number(tx.balance_after) : null,
      bankAccount: {
        id: tx.bankAccount.id.toString(),
        accountName: tx.bankAccount.accountName,
        bankName: tx.bankAccount.bankName,
      },
      linkedInvoice: tx.invoices
        ? {
            id: tx.invoices.id.toString(),
            invoiceNumber: tx.invoices.invoiceNumber,
          }
        : null,
    }))

    const categoryStats = categories
      .filter((c) => c.category)
      .map((c) => ({
        category: c.category,
        count: c._count,
        amount: Number(c._sum.amount || 0),
      }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

    return NextResponse.json({
      transactions: serializedTransactions,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
      stats: {
        total: stats._count,
        totalAmount: Number(stats._sum.amount || 0),
        creditCount: typeStats.find((s) => s.type === "credit")?._count || 0,
        creditAmount: Number(typeStats.find((s) => s.type === "credit")?._sum.amount || 0),
        debitCount: typeStats.find((s) => s.type === "debit")?._count || 0,
        debitAmount: Math.abs(Number(typeStats.find((s) => s.type === "debit")?._sum.amount || 0)),
        reconciledCount: await prisma.bankTransaction.count({ where: { ...where, isReconciled: true } }),
      },
      categories: categoryStats,
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des transactions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bankAccountId,
      transactionDate,
      valueDate,
      amount,
      type,
      label,
      description,
      counterpartyName,
      counterpartyAccount,
      reference,
      category,
      subCategory,
    } = body

    if (!bankAccountId || !transactionDate || amount === undefined || !type) {
      return NextResponse.json(
        { error: "Compte, date, montant et type sont requis" },
        { status: 400 }
      )
    }

    // Verify account exists
    const account = await prisma.bankAccount.findUnique({
      where: { id: BigInt(bankAccountId) },
    })

    if (!account) {
      return NextResponse.json(
        { error: "Compte bancaire non trouvé" },
        { status: 404 }
      )
    }

    // Generate unique transaction ID
    const transactionId = `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Calculate new balance
    const newBalance = Number(account.currentBalance) + Number(amount)

    // Create transaction
    const transaction = await prisma.bankTransaction.create({
      data: {
        tenant_id: BigInt(1),
        bankAccountId: BigInt(bankAccountId),
        transaction_id: transactionId,
        transactionDate: new Date(transactionDate),
        valueDate: valueDate ? new Date(valueDate) : null,
        amount,
        type: type as "credit" | "debit",
        label,
        description,
        counterparty_name: counterpartyName,
        counterparty_account: counterpartyAccount,
        reference,
        category,
        sub_category: subCategory,
        balance_after: newBalance,
        status: "completed",
        isReconciled: false,
      },
    })

    // Update account balance
    await prisma.bankAccount.update({
      where: { id: BigInt(bankAccountId) },
      data: {
        currentBalance: newBalance,
        availableBalance: newBalance,
      },
    })

    return NextResponse.json({
      id: transaction.id.toString(),
      transactionId: transaction.transaction_id,
    })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la transaction" },
      { status: 500 }
    )
  }
}
