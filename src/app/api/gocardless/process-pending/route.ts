import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GocardlessClient } from "@/lib/gocardless"

// POST: Process a pending connection manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { connectionId } = body

    // Get the pending connection
    const connection = connectionId
      ? await prisma.gocardlessConnection.findUnique({
          where: { id: BigInt(connectionId) },
        })
      : await prisma.gocardlessConnection.findFirst({
          where: {
            tenant_id: BigInt(1),
            status: "pending",
          },
          orderBy: { createdAt: "desc" },
        })

    if (!connection) {
      return NextResponse.json({ error: "No pending connection found" }, { status: 404 })
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

    // Get requisition status from GoCardless
    const requisition = await client.getRequisition(connection.requisitionId)

    if (requisition.status === "LN" && requisition.accounts.length > 0) {
      // Connection successful - get account details
      const accountId = requisition.accounts[0]
      const accountInfo = await client.getAccount(accountId)
      const accountDetails = await client.getAccountDetails(accountId)
      const balances = await client.getAccountBalances(accountId)

      // Find current balance
      const currentBalance = balances.balances.find(
        (b) => b.balanceType === "interimAvailable" || b.balanceType === "closingBooked"
      )

      // Try to find existing bank account
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
        // Try to find by previous GoCardless connection to same institution
        const previousConnection = await prisma.gocardlessConnection.findFirst({
          where: {
            tenant_id: BigInt(1),
            institutionId: connection.institutionId,
            bank_account_id: { not: null },
            id: { not: connection.id },
          },
          include: { bank_accounts: true },
          orderBy: { createdAt: "desc" },
        })
        if (previousConnection?.bank_accounts) {
          bankAccount = previousConnection.bank_accounts
        }
      }

      if (!bankAccount) {
        bankAccount = await prisma.bankAccount.findFirst({
          where: {
            tenant_id: BigInt(1),
            connectionProvider: "gocardless",
            bankName: connection.institutionName,
          },
        })
      }

      if (!bankAccount) {
        // Create new bank account
        bankAccount = await prisma.bankAccount.create({
          data: {
            tenant_id: BigInt(1),
            bankName: connection.institutionName,
            accountName: accountDetails.account.name || accountDetails.account.ownerName || "Compte bancaire",
            iban: accountDetails.account.iban || null,
            accountNumber: accountId,
            accountType: accountDetails.account.cashAccountType === "CACC" ? "checking" : "savings",
            currentBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : 0,
            availableBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : 0,
            currency: accountDetails.account.currency || "EUR",
            status: "active",
            connectionProvider: "gocardless",
            connectionId: accountId,
            lastSyncAt: new Date(),
            createdAt: new Date(),
          },
        })
      } else {
        // Update existing
        await prisma.bankAccount.update({
          where: { id: bankAccount.id },
          data: {
            connectionProvider: "gocardless",
            connectionId: accountId,
            accountNumber: accountId,
            iban: accountDetails.account.iban || bankAccount.iban,
            currentBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : bankAccount.currentBalance,
            availableBalance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : bankAccount.availableBalance,
            lastSyncAt: new Date(),
            syncError: null,
          },
        })
      }

      // Update connection
      await prisma.gocardlessConnection.update({
        where: { id: connection.id },
        data: {
          bank_account_id: bankAccount.id,
          account_id: accountId,
          status: "linked",
          agreement_accepted_at: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      })

      return NextResponse.json({
        success: true,
        message: `Compte "${bankAccount.accountName}" connecté avec succès`,
        bankAccount: {
          id: bankAccount.id.toString(),
          accountName: bankAccount.accountName,
          balance: currentBalance ? parseFloat(currentBalance.balanceAmount.amount) : null,
        },
      })
    } else if (requisition.status === "CR") {
      return NextResponse.json({
        success: false,
        status: "pending",
        message: "La connexion est en attente d'authentification bancaire",
        link: connection.link,
      })
    } else if (requisition.status === "EX") {
      await prisma.gocardlessConnection.update({
        where: { id: connection.id },
        data: { status: "expired", error_message: "Connection expired" },
      })
      return NextResponse.json({ error: "Connection expired", status: "expired" }, { status: 400 })
    } else if (requisition.status === "RJ") {
      await prisma.gocardlessConnection.update({
        where: { id: connection.id },
        data: { status: "error", error_message: "Connection rejected by bank" },
      })
      return NextResponse.json({ error: "Connection rejected", status: "rejected" }, { status: 400 })
    } else {
      return NextResponse.json({
        error: `Unexpected status: ${requisition.status}`,
        status: requisition.status,
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error processing pending connection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process connection" },
      { status: 500 }
    )
  }
}
