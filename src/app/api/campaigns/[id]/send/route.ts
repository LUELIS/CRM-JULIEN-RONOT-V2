import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  sendCampaignEmail,
  personalizeContent,
  addLinkTracking,
} from "@/lib/campaign-email"

// POST: Send a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const testMode = body.testMode === true
    const testEmail = body.testEmail

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: BigInt(id) },
    })

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (!campaign.htmlContent) {
      return NextResponse.json(
        { error: "Campaign has no content" },
        { status: 400 }
      )
    }

    // Test mode: send to a single email
    if (testMode) {
      if (!testEmail) {
        return NextResponse.json(
          { error: "Test email required" },
          { status: 400 }
        )
      }

      try {
        await sendCampaignEmail({
          to: testEmail,
          subject: `[TEST] ${campaign.subject}`,
          html: campaign.htmlContent,
          text: campaign.textContent || undefined,
          fromName: campaign.fromName || undefined,
          fromEmail: campaign.fromEmail || undefined,
          replyTo: campaign.replyTo || undefined,
        })

        return NextResponse.json({
          success: true,
          message: `Test email sent to ${testEmail}`,
        })
      } catch (error) {
        console.error("Error sending test email:", error)
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to send test email" },
          { status: 500 }
        )
      }
    }

    // Get pending recipients
    const recipients = await prisma.emailRecipient.findMany({
      where: {
        campaignId: BigInt(id),
        status: "pending",
      },
    })

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No pending recipients" },
        { status: 400 }
      )
    }

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id: BigInt(id) },
      data: { status: "sending" },
    })

    let sentCount = 0
    let failedCount = 0

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        // Personalize content
        let html = personalizeContent(campaign.htmlContent, {
          email: recipient.email,
          name: recipient.name,
        })

        let text = campaign.textContent
          ? personalizeContent(campaign.textContent, {
              email: recipient.email,
              name: recipient.name,
            })
          : undefined

        // Add link tracking
        if (recipient.trackingId) {
          html = addLinkTracking(html, recipient.trackingId)
        }

        // Personalize subject
        const subject = personalizeContent(campaign.subject, {
          email: recipient.email,
          name: recipient.name,
        })

        await sendCampaignEmail({
          to: recipient.email,
          toName: recipient.name || undefined,
          subject,
          html,
          text,
          fromName: campaign.fromName || undefined,
          fromEmail: campaign.fromEmail || undefined,
          replyTo: campaign.replyTo || undefined,
          trackingId: recipient.trackingId || undefined,
        })

        // Update recipient status
        await prisma.emailRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "sent",
            sentAt: new Date(),
          },
        })

        sentCount++
      } catch (error) {
        console.error(`Error sending to ${recipient.email}:`, error)

        // Update recipient with error
        await prisma.emailRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          },
        })

        failedCount++
      }

      // Add a small delay between emails to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Update campaign status
    await prisma.emailCampaign.update({
      where: { id: BigInt(id) },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
    })
  } catch (error) {
    console.error("Error sending campaign:", error)

    // Reset campaign status on error
    await prisma.emailCampaign.update({
      where: { id: BigInt(id) },
      data: { status: "draft" },
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send campaign" },
      { status: 500 }
    )
  }
}
