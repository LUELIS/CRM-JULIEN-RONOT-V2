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

// GET - List all domains
export async function GET() {
  try {
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const client = createMySendmailClient({ apiKey })
    const domains = await client.getDomains()

    return NextResponse.json({ domains })
  } catch (error) {
    console.error("My-Sendmail domains list error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la récupération des domaines" },
      { status: 500 }
    )
  }
}

// POST - Create domain
export async function POST(request: NextRequest) {
  try {
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const { name, dailyLimit, monthlyLimit } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Nom de domaine requis" },
        { status: 400 }
      )
    }

    const client = createMySendmailClient({ apiKey })
    const domain = await client.createDomain(
      name,
      dailyLimit || 1000,
      monthlyLimit || 30000
    )

    return NextResponse.json({ domain })
  } catch (error) {
    console.error("My-Sendmail create domain error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création du domaine" },
      { status: 500 }
    )
  }
}
