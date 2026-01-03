import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: List all campaigns
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = {
      tenant_id: BigInt(1),
    }

    if (status) {
      where.status = status
    }

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { recipients: true },
          },
        },
      }),
      prisma.emailCampaign.count({ where }),
    ])

    // Get stats for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const stats = await prisma.emailRecipient.groupBy({
          by: ["status"],
          where: { campaignId: campaign.id },
          _count: true,
        })

        const statsMap = stats.reduce(
          (acc, s) => {
            acc[s.status] = s._count
            return acc
          },
          {} as Record<string, number>
        )

        return {
          id: campaign.id.toString(),
          name: campaign.name,
          subject: campaign.subject,
          fromName: campaign.fromName,
          fromEmail: campaign.fromEmail,
          status: campaign.status,
          recipientType: campaign.recipientType,
          scheduledAt: campaign.scheduledAt?.toISOString() || null,
          sentAt: campaign.sentAt?.toISOString() || null,
          createdAt: campaign.createdAt?.toISOString() || null,
          recipientCount: campaign._count.recipients,
          stats: {
            pending: statsMap.pending || 0,
            sent: statsMap.sent || 0,
            delivered: statsMap.delivered || 0,
            opened: statsMap.opened || 0,
            clicked: statsMap.clicked || 0,
            bounced: statsMap.bounced || 0,
            failed: statsMap.failed || 0,
          },
        }
      })
    )

    return NextResponse.json({
      campaigns: campaignsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    )
  }
}

// POST: Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const campaign = await prisma.emailCampaign.create({
      data: {
        tenant_id: BigInt(1),
        name: body.name,
        subject: body.subject,
        fromName: body.fromName || null,
        fromEmail: body.fromEmail || null,
        replyTo: body.replyTo || null,
        designJson: body.designJson || null,
        htmlContent: body.htmlContent || null,
        textContent: body.textContent || null,
        status: "draft",
        recipientType: body.recipientType || "all_clients",
        recipientFilter: body.recipientFilter ? JSON.stringify(body.recipientFilter) : null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        createdBy: body.createdBy ? BigInt(body.createdBy) : null,
      },
    })

    return NextResponse.json({
      id: campaign.id.toString(),
      success: true,
    })
  } catch (error) {
    console.error("Error creating campaign:", error)
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    )
  }
}
