import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GocardlessClient } from "@/lib/gocardless"

// GET: Get current GoCardless rate limit info by making a lightweight API call
export async function GET() {
  try {
    // Get tenant settings
    const tenant = await prisma.tenants.findFirst({
      where: { id: BigInt(1) },
    })

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    const settings = tenant.settings ? JSON.parse(tenant.settings as string) : {}

    if (!settings.gocardlessSecretId || !settings.gocardlessSecretKey) {
      return NextResponse.json({
        configured: false,
        rateLimit: null,
      })
    }

    const client = new GocardlessClient(settings.gocardlessSecretId, settings.gocardlessSecretKey)

    // Make a lightweight request to capture rate limit headers
    // Getting institutions is a simple read operation
    await client.getInstitutions("FR")

    const rateLimitInfo = client.getRateLimitInfo()

    return NextResponse.json({
      configured: true,
      rateLimit: {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        reset: rateLimitInfo.reset?.toISOString() || null,
        lastUpdated: rateLimitInfo.lastUpdated?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error("Error fetching rate limit:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch rate limit" },
      { status: 500 }
    )
  }
}
