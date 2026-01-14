import { NextRequest, NextResponse } from "next/server"
import { createMySendmailClient } from "@/lib/my-sendmail"
import { prisma } from "@/lib/prisma"

async function getApiKey(): Promise<string | null> {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
    select: { settings: true },
  })

  if (!tenant?.settings) return null

  const settings = JSON.parse(tenant.settings as string)
  return settings.mySendmailApiKey || null
}

// PUT - Update account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const { id: domainId, accountId } = await params
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const { password, active } = await request.json()

    const client = createMySendmailClient({ apiKey })
    const account = await client.updateAccount(domainId, accountId, {
      password,
      active,
    })

    return NextResponse.json({ account })
  } catch (error) {
    console.error("My-Sendmail update account error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la modification du compte" },
      { status: 500 }
    )
  }
}

// DELETE - Delete account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const { id: domainId, accountId } = await params
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const client = createMySendmailClient({ apiKey })
    await client.deleteAccount(domainId, accountId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("My-Sendmail delete account error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la suppression du compte" },
      { status: 500 }
    )
  }
}
