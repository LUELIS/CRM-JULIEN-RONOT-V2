import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GocardlessClient } from "@/lib/gocardless"
import { randomUUID } from "crypto"

// POST: Initiate a bank connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { institutionId, institutionName, institutionLogo, maxHistoricalDays = 90 } = body

    if (!institutionId) {
      return NextResponse.json({ error: "Institution ID is required" }, { status: 400 })
    }

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
        { error: "GoCardless is not configured" },
        { status: 400 }
      )
    }

    const client = new GocardlessClient(settings.gocardlessSecretId, settings.gocardlessSecretKey)

    // Generate a unique reference
    const reference = `CRM-${randomUUID().substring(0, 8)}`

    // Determine redirect URL
    const baseUrl = process.env.NEXTAUTH_URL || request.headers.get("origin") || "http://localhost:3000"
    const redirectUri = `${baseUrl}/api/gocardless/callback`

    // Create agreement first
    const agreement = await client.createAgreement(institutionId, maxHistoricalDays) as { id: string }

    // Create requisition
    const requisition = await client.createRequisition(
      institutionId,
      redirectUri,
      reference,
      agreement.id
    )

    // Store connection in database
    await prisma.gocardlessConnection.create({
      data: {
        tenant_id: BigInt(1),
        requisitionId: requisition.id,
        institutionId,
        institutionName: institutionName || institutionId,
        institution_logo: institutionLogo || null,
        link: requisition.link,
        status: "pending",
        max_historical_days: maxHistoricalDays,
        access_valid_for_days: 90,
        createdAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      requisitionId: requisition.id,
      link: requisition.link,
      reference,
    })
  } catch (error) {
    console.error("Error creating connection:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create connection" },
      { status: 500 }
    )
  }
}
