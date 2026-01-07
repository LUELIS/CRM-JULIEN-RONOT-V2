import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiToken, apiError, apiSuccess } from "../../auth"
import { sendO365Email, generateTicketEmailTemplate } from "@/lib/o365-email"

// GET /api/external/support/:id/messages - Get ticket messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await validateApiToken(request)
  if (!context.valid) {
    return apiError(context.error || "Unauthorized", 401)
  }

  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const includeInternal = searchParams.get("includeInternal") === "true"

    // Find ticket
    const where = id.startsWith("TKT-")
      ? { ticketNumber: id, tenant_id: context.tenantId }
      : { id: BigInt(id), tenant_id: context.tenantId }

    const ticket = await prisma.ticket.findFirst({ where })

    if (!ticket) {
      return apiError("Ticket not found", 404)
    }

    const messageWhere: Record<string, unknown> = {
      ticketId: ticket.id,
    }

    // By default, exclude internal notes for external API
    if (!includeInternal) {
      messageWhere.isInternal = false
    }

    const messages = await prisma.ticketMessage.findMany({
      where: messageWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticket_attachments: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return apiSuccess({
      ticketId: ticket.id.toString(),
      ticketNumber: ticket.ticketNumber,
      messages: messages.map((msg) => ({
        id: msg.id.toString(),
        type: msg.type,
        content: msg.content,
        fromEmail: msg.from_email,
        fromName: msg.from_name,
        toEmail: msg.to_email,
        isInternal: msg.isInternal,
        createdAt: msg.createdAt?.toISOString() || null,
        author: msg.user
          ? {
              id: msg.user.id.toString(),
              name: msg.user.name,
              email: msg.user.email,
            }
          : null,
        attachments: msg.ticket_attachments.map((att) => ({
          id: att.id.toString(),
          filename: att.originalName,
          mimeType: att.mimeType,
          size: att.size,
        })),
      })),
    })
  } catch (error) {
    console.error("[External API] Error fetching messages:", error)
    return apiError("Internal server error", 500)
  }
}

// POST /api/external/support/:id/messages - Add message/reply to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await validateApiToken(request)
  if (!context.valid) {
    return apiError(context.error || "Unauthorized", 401)
  }

  try {
    const { id } = await params
    const body = await request.json()

    // Validate required fields
    if (!body.content) {
      return apiError("Missing required field: content", 400)
    }

    // Find ticket
    const where = id.startsWith("TKT-")
      ? { ticketNumber: id, tenant_id: context.tenantId }
      : { id: BigInt(id), tenant_id: context.tenantId }

    const ticket = await prisma.ticket.findFirst({ where })

    if (!ticket) {
      return apiError("Ticket not found", 404)
    }

    // Determine message type
    // external API can send: "reply" (staff reply to client), "note" (internal note), "client_message" (client message)
    const messageType = body.type || "reply"
    let dbMessageType: "email_in" | "email_out" | "note" | "system" = "note"
    let isInternal = false

    switch (messageType) {
      case "reply":
        dbMessageType = "email_out"
        isInternal = false
        break
      case "note":
        dbMessageType = "note"
        isInternal = true
        break
      case "client_message":
        dbMessageType = "email_in"
        isInternal = false
        break
      default:
        return apiError("Invalid message type. Must be one of: reply, note, client_message", 400)
    }

    // Create message
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        client_id: ticket.clientId,
        type: dbMessageType,
        content: body.content,
        from_email: body.fromEmail || null,
        from_name: body.fromName || null,
        to_email: body.toEmail || ticket.senderEmail,
        isInternal,
        createdAt: new Date(),
      },
    })

    // Update ticket
    const updateData: Record<string, unknown> = {
      lastActivityAt: new Date(),
      responseCount: { increment: 1 },
    }

    // Set first response time if this is the first staff response
    if (!ticket.firstResponseAt && messageType === "reply") {
      updateData.firstResponseAt = new Date()
    }

    // Update status based on message type
    if (messageType === "reply" && ticket.status === "new") {
      updateData.status = "open"
    } else if (messageType === "client_message" && ticket.status === "resolved") {
      updateData.status = "open" // Reopen if client responds after resolution
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: updateData,
    })

    // Send email for staff replies if requested
    let emailSent = false
    let emailError: string | null = null

    if (messageType === "reply" && body.sendEmail !== false) {
      const recipientEmail = body.toEmail || ticket.senderEmail

      if (recipientEmail) {
        // Get tenant info
        const tenant = await prisma.tenants.findFirst({
          where: { id: context.tenantId },
          select: { name: true, logo: true },
        })

        // Build email
        const emailSubject = ticket.subject.startsWith("Re:")
          ? ticket.subject
          : `Re: ${ticket.subject}`

        const emailBody = generateTicketEmailTemplate({
          logo: tenant?.logo || null,
          companyName: tenant?.name || "Support",
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          newMessage: body.content,
          senderName: body.fromName || "Support",
          senderEmail: body.fromEmail || "",
          recipientName: ticket.senderName || "Client",
          history: [],
        })

        console.log(`[External API] Sending email to ${recipientEmail}...`)

        const result = await sendO365Email({
          to: recipientEmail,
          subject: emailSubject,
          body: emailBody,
          isHtml: true,
          replyToMessageId: ticket.emailMessageId || undefined,
        })

        emailSent = result.success
        emailError = result.error || null

        // Update message with email status
        await prisma.ticketMessage.update({
          where: { id: message.id },
          data: {
            emailSent: result.success,
            emailError: result.error || null,
          },
        })
      }
    }

    return apiSuccess(
      {
        id: message.id.toString(),
        ticketId: ticket.id.toString(),
        ticketNumber: ticket.ticketNumber,
        type: messageType,
        content: message.content,
        isInternal: message.isInternal,
        createdAt: message.createdAt?.toISOString() || null,
        emailSent: messageType === "reply" ? emailSent : null,
        emailError: messageType === "reply" ? emailError : null,
      },
      201
    )
  } catch (error) {
    console.error("[External API] Error creating message:", error)
    return apiError("Internal server error", 500)
  }
}
