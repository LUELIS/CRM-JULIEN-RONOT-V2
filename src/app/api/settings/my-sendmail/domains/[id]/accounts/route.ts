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

// POST - Create account for domain
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: domainId } = await params
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    const client = createMySendmailClient({ apiKey })
    const account = await client.createAccount(domainId, email, password)

    return NextResponse.json({ account })
  } catch (error) {
    console.error("My-Sendmail create account error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
