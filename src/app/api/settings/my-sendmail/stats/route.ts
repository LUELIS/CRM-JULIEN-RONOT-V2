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

// GET - Get stats
export async function GET(request: NextRequest) {
  try {
    const apiKey = await getApiKey()

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API My-Sendmail non configurée" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7")

    const client = createMySendmailClient({ apiKey })

    // Fetch both stats and timeseries in parallel
    const [stats, timeseries] = await Promise.all([
      client.getStats(),
      client.getTimeseries(days),
    ])

    return NextResponse.json({ stats, timeseries })
  } catch (error) {
    console.error("My-Sendmail stats error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
