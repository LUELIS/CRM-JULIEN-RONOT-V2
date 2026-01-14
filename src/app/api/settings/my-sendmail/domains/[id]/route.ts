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

// GET - Get single domain
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const client = createMySendmailClient({ apiKey })
    const domain = await client.getDomain(id)

    return NextResponse.json({ domain })
  } catch (error) {
    console.error("My-Sendmail get domain error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la récupération du domaine" },
      { status: 500 }
    )
  }
}

// PUT - Update domain
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { dailyLimit, monthlyLimit, active } = body

    const client = createMySendmailClient({ apiKey })
    const domain = await client.updateDomain(id, {
      dailyLimit,
      monthlyLimit,
      active,
    })

    return NextResponse.json({ domain })
  } catch (error) {
    console.error("My-Sendmail update domain error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la modification du domaine" },
      { status: 500 }
    )
  }
}

// DELETE - Delete domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const client = createMySendmailClient({ apiKey })
    await client.deleteDomain(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("My-Sendmail delete domain error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la suppression du domaine" },
      { status: 500 }
    )
  }
}
