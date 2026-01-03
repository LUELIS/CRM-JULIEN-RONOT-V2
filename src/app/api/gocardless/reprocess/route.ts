import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GocardlessClient } from "@/lib/gocardless"

// POST: Reprocess an existing connection to get ALL accounts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { connectionId } = body

    // Get the connection
    const connection = await prisma.gocardlessConnection.findUnique({
      where: { id: BigInt(connectionId) },
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Get tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: connection.tenant_id },
    })

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    const settings = tenant.settings ? JSON.parse(tenant.settings as string) : {}
    const client = new GocardlessClient(settings.gocardlessSecretId, settings.gocardlessSecretKey)

    // Get requisition with all accounts
    const requisition = await client.getRequisition(connection.requisitionId)

    if (requisition.status !== "LN") {
      return NextResponse.json({
        error: `Requisition not linked. Status: ${requisition.status}`,
      }, { status: 400 })
    }

    const accountIds = requisition.accounts
    const results: Array<{ accountId: string; name: string; balance: number | null; status: "created" | "updated" | "error"; error?: string }> = []

    for (const accountId of accountIds) {
      try {
        const accountDetails = await client.getAccountDetails(accountId)
        const balances = await client.getAccountBalances(accountId)

        const currentBalance = balances.balances.find(
          (b) => b.balanceType === "interimAvailable" || b.balanceType === "closingBooked"
        )

        // Check if account already exists
        let bankAccount = null

        if (accountDetails.account.iban) {
          bankAccount = await prisma.bankAccount.findFirst({
            where: {
              tenant_id: BigInt(1),
              iban: accountDetails.account.iban,
            },
          })
        }

        if (!bankAccount) {
          bankAccount = await prisma.bankAccount.findFirst({
            where: {
              tenant_id: BigInt(1),
              connectionProvider: "gocardless",
              accountNumber: accountId,
            },
          })
        }

        const accountName = accountDetails.account.name || accountDetails.account.ownerName || "Compte bancaire"
        const balance = currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : null

        if (!bankAccount) {
          // Create new
          await prisma.bankAccount.create({
            data: {
              tenant_id: BigInt(1),
              bankName: connection.institutionName,
              accountName,
              iban: accountDetails.account.iban || null,
              accountNumber: accountId,
              accountType: accountDetails.account.cashAccountType === "CACC" ? "checking" : "savings",
              currentBalance: balance || 0,
              availableBalance: balance || 0,
              currency: accountDetails.account.currency || "EUR",
              status: "active",
              connectionProvider: "gocardless",
              connectionId: accountId,
              lastSyncAt: new Date(),
              createdAt: new Date(),
            },
          })
          results.push({ accountId, name: accountName, balance, status: "created" })
        } else {
          // Update
          await prisma.bankAccount.update({
            where: { id: bankAccount.id },
            data: {
              connectionProvider: "gocardless",
              connectionId: accountId,
              currentBalance: balance ?? bankAccount.currentBalance,
              availableBalance: balance ?? bankAccount.availableBalance,
              lastSyncAt: new Date(),
              syncError: null,
            },
          })
          results.push({ accountId, name: accountName, balance, status: "updated" })
        }
      } catch (error) {
        results.push({
          accountId,
          name: "Unknown",
          balance: null,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Update connection with all account IDs
    await prisma.gocardlessConnection.update({
      where: { id: connection.id },
      data: {
        account_id: accountIds.join(","),
      },
    })

    return NextResponse.json({
      success: true,
      totalAccounts: accountIds.length,
      results,
    })
  } catch (error) {
    console.error("Error reprocessing connection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reprocess" },
      { status: 500 }
    )
  }
}
