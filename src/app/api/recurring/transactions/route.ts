import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const transactions = await prisma.recurringTransaction.findMany({
      where: {
        tenant_id: BigInt(1),
      },
      include: {
        bankAccount: {
          select: {
            id: true,
            accountName: true,
            bankName: true,
          },
        },
        clients: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: [
        { type: "asc" },
        { category: "asc" },
        { name: "asc" },
      ],
    })

    // Calculate totals
    let totalExpenses = 0
    let totalIncome = 0
    const expensesByCategory: Record<string, number> = {}
    const incomeByCategory: Record<string, number> = {}

    const formattedTransactions = transactions.map((t) => {
      const monthlyAmount = calculateMonthlyAmount(
        Number(t.amount),
        t.frequency,
        t.interval
      )

      if (t.type === "expense") {
        totalExpenses += monthlyAmount
        const cat = t.category || "Autre"
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + monthlyAmount
      } else {
        totalIncome += monthlyAmount
        const cat = t.category || "Autre"
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + monthlyAmount
      }

      return {
        id: t.id.toString(),
        name: t.name,
        description: t.description,
        amount: Number(t.amount),
        monthlyAmount,
        type: t.type,
        category: t.category,
        subCategory: t.sub_category,
        frequency: t.frequency,
        interval: t.interval,
        startDate: t.start_date.toISOString(),
        endDate: t.end_date?.toISOString() || null,
        nextOccurrence: t.next_occurrence?.toISOString() || null,
        status: t.status,
        autoCreate: t.auto_create_transaction,
        autoReconcile: t.auto_reconcile,
        occurrencesCount: t.occurrences_count,
        totalAmount: Number(t.total_amount),
        bankAccount: t.bankAccount
          ? {
              id: t.bankAccount.id.toString(),
              name: t.bankAccount.accountName,
              bank: t.bankAccount.bankName,
            }
          : null,
        client: t.clients
          ? {
              id: t.clients.id.toString(),
              name: t.clients.companyName,
            }
          : null,
      }
    })

    const expenses = formattedTransactions.filter((t) => t.type === "expense")
    const income = formattedTransactions.filter((t) => t.type === "income")

    return NextResponse.json({
      transactions: formattedTransactions,
      expenses,
      income,
      totals: {
        monthlyExpenses: totalExpenses,
        monthlyIncome: totalIncome,
        netMonthly: totalIncome - totalExpenses,
        yearlyExpenses: totalExpenses * 12,
        yearlyIncome: totalIncome * 12,
        netYearly: (totalIncome - totalExpenses) * 12,
        expenseCount: expenses.length,
        incomeCount: income.length,
      },
      expensesByCategory,
      incomeByCategory,
    })
  } catch (error) {
    console.error("Error fetching recurring transactions:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des transactions récurrentes" },
      { status: 500 }
    )
  }
}

function calculateMonthlyAmount(
  amount: number,
  frequency: string,
  interval: number
): number {
  switch (frequency) {
    case "daily":
      return (amount * 30) / interval
    case "weekly":
      return (amount * 4.33) / interval
    case "biweekly":
      return (amount * 2.17) / interval
    case "monthly":
      return amount / interval
    case "quarterly":
      return amount / (interval * 3)
    case "biannually":
      return amount / (interval * 6)
    case "yearly":
      return amount / (interval * 12)
    default:
      return amount
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const transaction = await prisma.recurringTransaction.create({
      data: {
        tenant_id: BigInt(1),
        name: body.name,
        description: body.description || null,
        amount: body.amount,
        type: body.type,
        frequency: body.frequency,
        interval: 1,
        start_date: new Date(),
        next_occurrence: body.nextOccurrence ? new Date(body.nextOccurrence) : new Date(),
        status: body.status || "active",
        category: body.category || null,
        auto_create_transaction: false,
        auto_reconcile: false,
      },
    })

    return NextResponse.json({
      id: transaction.id.toString(),
      name: transaction.name,
      success: true,
    })
  } catch (error) {
    console.error("Error creating recurring transaction:", error)
    return NextResponse.json(
      { error: "Erreur lors de la creation de la transaction recurrente" },
      { status: 500 }
    )
  }
}
