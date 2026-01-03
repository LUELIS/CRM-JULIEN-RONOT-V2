import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GocardlessClient } from "@/lib/gocardless"

// GET: List available institutions (banks) for a country
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country") || "FR"

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
        { error: "GoCardless is not configured. Please configure it in Settings > Integrations." },
        { status: 400 }
      )
    }

    const client = new GocardlessClient(settings.gocardlessSecretId, settings.gocardlessSecretKey)
    const institutions = await client.getInstitutions(country)

    // Return sorted by name
    institutions.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      institutions: institutions.map((inst) => ({
        id: inst.id,
        name: inst.name,
        bic: inst.bic,
        logo: inst.logo,
        countries: inst.countries,
        maxHistoricalDays: parseInt(inst.transaction_total_days) || 90,
      })),
      country,
    })
  } catch (error) {
    console.error("Error fetching institutions:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch institutions" },
      { status: 500 }
    )
  }
}
