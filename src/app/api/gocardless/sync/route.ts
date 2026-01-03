import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GocardlessClient } from "@/lib/gocardless"

// POST: Sync transactions for a bank account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bankAccountId, dateFrom, dateTo } = body

    // Get tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    const settings = tenant.settings ? JSON.parse(tenant.settings as string) : {}

    if (!settings.gocardlessEnabled || !settings.gocardlessSecretId || !settings.gocardlessSecretKey) {
      return NextResponse.json(
        { error: "GoCardless is not configured" },
        { status: 400 }
      )
    }

    // Get bank accounts to sync
    let bankAccounts
    if (bankAccountId) {
      bankAccounts = await prisma.bankAccount.findMany({
        where: {
          id: BigInt(bankAccountId),
          tenant_id: BigInt(1),
          connectionProvider: "gocardless",
        },
      })
    } else {
      // Sync all connected accounts
      bankAccounts = await prisma.bankAccount.findMany({
        where: {
          tenant_id: BigInt(1),
          connectionProvider: "gocardless",
        },
      })
    }

    if (bankAccounts.length === 0) {
      return NextResponse.json(
        { error: "No connected bank accounts found" },
        { status: 404 }
      )
    }

    const client = new GocardlessClient(settings.gocardlessSecretId, settings.gocardlessSecretKey)
    const results = []

    for (const account of bankAccounts) {
      try {
        // Get GoCardless account ID - check multiple sources for backward compatibility:
        // - connectionId if it looks like a UUID (new format)
        // - accountNumber which stored the UUID in Laravel version
        let gocardlessAccountId = account.connectionId

        // If connectionId is a numeric ID (reference to gocardless_connections), use accountNumber instead
        if (!gocardlessAccountId || /^\d+$/.test(gocardlessAccountId)) {
          gocardlessAccountId = account.accountNumber
        }

        if (!gocardlessAccountId) {
          // Try to find via gocardless_connections table
          const connection = await prisma.gocardlessConnection.findFirst({
            where: {
              bank_account_id: account.id,
              account_id: { not: null },
            },
          })
          gocardlessAccountId = connection?.account_id || null
        }

        if (!gocardlessAccountId) {
          results.push({
            accountId: account.id.toString(),
            accountName: account.accountName,
            error: "No GoCardless account ID found - reconnection required",
          })
          continue
        }

        // Get balances
        const balances = await client.getAccountBalances(gocardlessAccountId)
        const currentBalance = balances.balances.find(
          (b) => b.balanceType === "interimAvailable" || b.balanceType === "closingBooked"
        )

        // Calculate date range
        const fromDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        const toDate = dateTo || new Date().toISOString().split("T")[0]

        // Get transactions
        const transactionsData = await client.getAccountTransactions(gocardlessAccountId, fromDate, toDate)
        const allTransactions = [
          ...transactionsData.transactions.booked,
          ...transactionsData.transactions.pending,
        ]

        let newCount = 0
        let updatedCount = 0

        for (const tx of allTransactions) {
          const externalId = tx.transactionId || tx.internalTransactionId
          if (!externalId) continue

          const amount = parseFloat(tx.transactionAmount.amount)
          const type = amount >= 0 ? "credit" : "debit"

          // Check if transaction exists
          const existing = await prisma.bankTransaction.findFirst({
            where: {
              bankAccountId: account.id,
              OR: [
                { externalId },
                { transaction_id: externalId },
              ],
            },
          })

          const transactionData = {
            bankAccountId: account.id,
            tenant_id: BigInt(1),
            externalId,
            transaction_id: externalId,
            transactionDate: new Date(tx.bookingDate || tx.valueDate),
            valueDate: tx.valueDate ? new Date(tx.valueDate) : null,
            amount: Math.abs(amount),
            currency: tx.transactionAmount.currency || "EUR",
            type: type as "credit" | "debit",
            label: tx.remittanceInformationUnstructured ||
                   tx.remittanceInformationUnstructuredArray?.join(" ") ||
                   null,
            description: tx.remittanceInformationUnstructuredArray?.join("\n") || null,
            counterparty_name: type === "credit" ? tx.debtorName : tx.creditorName || null,
            counterparty_account: type === "credit"
              ? tx.debtorAccount?.iban
              : tx.creditorAccount?.iban || null,
            reference: tx.bankTransactionCode || tx.proprietaryBankTransactionCode || null,
            status: "completed" as const,
            raw_data: JSON.stringify(tx),
          }

          if (existing) {
            await prisma.bankTransaction.update({
              where: { id: existing.id },
              data: transactionData,
            })
            updatedCount++
          } else {
            await prisma.bankTransaction.create({
              data: {
                ...transactionData,
                createdAt: new Date(),
              },
            })
            newCount++
          }
        }

        // Update bank account balance and last sync
        await prisma.bankAccount.update({
          where: { id: account.id },
          data: {
            currentBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : account.currentBalance,
            availableBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : account.availableBalance,
            lastSyncAt: new Date(),
            syncError: null,
          },
        })

        results.push({
          accountId: account.id.toString(),
          accountName: account.accountName,
          newTransactions: newCount,
          updatedTransactions: updatedCount,
          totalSynced: allTransactions.length,
          balance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : null,
        })
      } catch (error) {
        console.error(`Error syncing account ${account.id}:`, error)

        // Update sync error
        await prisma.bankAccount.update({
          where: { id: account.id },
          data: {
            syncError: error instanceof Error ? error.message : "Unknown error",
            lastSyncAt: new Date(),
          },
        })

        results.push({
          accountId: account.id.toString(),
          accountName: account.accountName,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Get rate limit info after sync
    const rateLimitInfo = client.getRateLimitInfo()

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      results,
      rateLimit: {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        reset: rateLimitInfo.reset?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error("Error syncing transactions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync transactions" },
      { status: 500 }
    )
  }
}
