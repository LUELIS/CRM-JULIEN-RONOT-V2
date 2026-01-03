import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET: Get a single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: BigInt(id) },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Get recipient stats
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

    return NextResponse.json({
      id: campaign.id.toString(),
      name: campaign.name,
      subject: campaign.subject,
      fromName: campaign.fromName,
      fromEmail: campaign.fromEmail,
      replyTo: campaign.replyTo,
      designJson: campaign.designJson,
      htmlContent: campaign.htmlContent,
      textContent: campaign.textContent,
      status: campaign.status,
      recipientType: campaign.recipientType,
      recipientFilter: campaign.recipientFilter
        ? JSON.parse(campaign.recipientFilter)
        : null,
      scheduledAt: campaign.scheduledAt?.toISOString() || null,
      sentAt: campaign.sentAt?.toISOString() || null,
      createdAt: campaign.createdAt?.toISOString() || null,
      updatedAt: campaign.updatedAt?.toISOString() || null,
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
    })
  } catch (error) {
    console.error("Error fetching campaign:", error)
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    )
  }
}

// PUT: Update a campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()

    const campaign = await prisma.emailCampaign.update({
      where: { id: BigInt(id) },
      data: {
        name: body.name,
        subject: body.subject,
        fromName: body.fromName || null,
        fromEmail: body.fromEmail || null,
        replyTo: body.replyTo || null,
        designJson: body.designJson || null,
        htmlContent: body.htmlContent || null,
        textContent: body.textContent || null,
        recipientType: body.recipientType,
        recipientFilter: body.recipientFilter
          ? JSON.stringify(body.recipientFilter)
          : null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      },
    })

    return NextResponse.json({
      id: campaign.id.toString(),
      success: true,
    })
  } catch (error) {
    console.error("Error updating campaign:", error)
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    )
  }
}

// DELETE: Delete a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.emailCampaign.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting campaign:", error)
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    )
  }
}
