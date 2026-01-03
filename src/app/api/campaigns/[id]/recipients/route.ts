import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateTrackingId } from "@/lib/campaign-email"

// GET: List recipients for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const status = searchParams.get("status")

  try {
    const where: Record<string, unknown> = {
      campaignId: BigInt(id),
    }

    if (status) {
      where.status = status
    }

    const [recipients, total] = await Promise.all([
      prisma.emailRecipient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailRecipient.count({ where }),
    ])

    return NextResponse.json({
      recipients: recipients.map((r) => ({
        id: r.id.toString(),
        email: r.email,
        name: r.name,
        clientId: r.clientId?.toString() || null,
        status: r.status,
        sentAt: r.sentAt?.toISOString() || null,
        openedAt: r.openedAt?.toISOString() || null,
        clickedAt: r.clickedAt?.toISOString() || null,
        bouncedAt: r.bouncedAt?.toISOString() || null,
        errorMessage: r.errorMessage,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching recipients:", error)
    return NextResponse.json(
      { error: "Failed to fetch recipients" },
      { status: 500 }
    )
  }
}

// POST: Add recipients to a campaign (or generate from filter)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: BigInt(id) },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // If manual list provided
    if (body.recipients && Array.isArray(body.recipients)) {
      const created = await Promise.all(
        body.recipients.map(async (r: { email: string; name?: string; clientId?: string }) => {
          return prisma.emailRecipient.create({
            data: {
              tenant_id: BigInt(1),
              campaignId: BigInt(id),
              clientId: r.clientId ? BigInt(r.clientId) : null,
              email: r.email,
              name: r.name || null,
              trackingId: generateTrackingId(),
            },
          })
        })
      )

      return NextResponse.json({
        success: true,
        count: created.length,
      })
    }

    // Generate from recipientType
    let clientWhere: Record<string, unknown> = { tenant_id: BigInt(1) }

    switch (campaign.recipientType) {
      case "active_clients":
        clientWhere.status = "active"
        break
      case "prospects":
        clientWhere.status = "prospect"
        break
      case "custom_filter":
        if (campaign.recipientFilter) {
          const filter = JSON.parse(campaign.recipientFilter)
          if (filter.status) clientWhere.status = filter.status
          if (filter.city) clientWhere.city = { contains: filter.city }
          // Add more filter options as needed
        }
        break
      // all_clients - no additional filter
    }

    // Get all clients with email
    const clients = await prisma.client.findMany({
      where: {
        ...clientWhere,
        OR: [
          { email: { not: null } },
          { contactEmail: { not: null } },
        ],
      },
      select: {
        id: true,
        companyName: true,
        email: true,
        contactEmail: true,
        contactFirstname: true,
        contactLastname: true,
      },
    })

    // Delete existing recipients first
    await prisma.emailRecipient.deleteMany({
      where: { campaignId: BigInt(id) },
    })

    // Create new recipients
    const created = await Promise.all(
      clients.map(async (client) => {
        const email = client.contactEmail || client.email
        if (!email) return null

        const name = client.contactFirstname
          ? `${client.contactFirstname} ${client.contactLastname || ""}`.trim()
          : client.companyName

        return prisma.emailRecipient.create({
          data: {
            tenant_id: BigInt(1),
            campaignId: BigInt(id),
            clientId: client.id,
            email,
            name,
            trackingId: generateTrackingId(),
          },
        })
      })
    )

    const count = created.filter(Boolean).length

    return NextResponse.json({
      success: true,
      count,
    })
  } catch (error) {
    console.error("Error adding recipients:", error)
    return NextResponse.json(
      { error: "Failed to add recipients" },
      { status: 500 }
    )
  }
}

// DELETE: Clear all recipients
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.emailRecipient.deleteMany({
      where: { campaignId: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error clearing recipients:", error)
    return NextResponse.json(
      { error: "Failed to clear recipients" },
      { status: 500 }
    )
  }
}
