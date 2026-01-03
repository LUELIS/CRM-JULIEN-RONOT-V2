import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: List all GoCardless connections
export async function GET() {
  try {
    const connections = await prisma.gocardlessConnection.findMany({
      where: { tenant_id: BigInt(1) },
      include: {
        bank_accounts: {
          select: {
            id: true,
            accountName: true,
            iban: true,
            currentBalance: true,
            lastSyncAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      connections: connections.map((c) => ({
        id: c.id.toString(),
        requisitionId: c.requisitionId,
        institutionId: c.institutionId,
        institutionName: c.institutionName,
        institutionLogo: c.institution_logo,
        status: c.status,
        errorMessage: c.error_message,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
        bankAccount: c.bank_accounts
          ? {
              id: c.bank_accounts.id.toString(),
              accountName: c.bank_accounts.accountName,
              iban: c.bank_accounts.iban,
              currentBalance: Number(c.bank_accounts.currentBalance),
              lastSyncAt: c.bank_accounts.lastSyncAt,
            }
          : null,
      })),
    })
  } catch (error) {
    console.error("Error fetching connections:", error)
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    )
  }
}

// DELETE: Remove a connection (keeps bank account and transactions)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get("id")

    if (!connectionId) {
      return NextResponse.json({ error: "Connection ID is required" }, { status: 400 })
    }

    // Get the connection first
    const connection = await prisma.gocardlessConnection.findUnique({
      where: { id: BigInt(connectionId) },
    })

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // If connection has a linked bank account, disconnect it but keep the account
    if (connection.bank_account_id) {
      await prisma.bankAccount.update({
        where: { id: connection.bank_account_id },
        data: {
          connectionProvider: null,
          connectionId: null,
          connectionToken: null,
        },
      })
    }

    // Delete the GoCardless connection record
    await prisma.gocardlessConnection.delete({
      where: { id: BigInt(connectionId) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting connection:", error)
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    )
  }
}
