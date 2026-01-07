import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiToken, apiError, apiSuccess } from "../auth"

// GET /api/external/support/:id - Get ticket details
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

    // Support both ID and ticket number lookup
    const where = id.startsWith("TKT-")
      ? { ticketNumber: id, tenant_id: context.tenantId }
      : { id: BigInt(id), tenant_id: context.tenantId }

    const ticket = await prisma.ticket.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            postalCode: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
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
        },
      },
    })

    if (!ticket) {
      return apiError("Ticket not found", 404)
    }

    return apiSuccess({
      id: ticket.id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      senderEmail: ticket.senderEmail,
      senderName: ticket.senderName,
      status: ticket.status,
      priority: ticket.priority,
      tags: ticket.tags ? ticket.tags.split(",").map((t) => t.trim()) : [],
      responseCount: ticket.responseCount,
      firstResponseAt: ticket.firstResponseAt?.toISOString() || null,
      resolvedAt: ticket.resolvedAt?.toISOString() || null,
      closedAt: ticket.closedAt?.toISOString() || null,
      lastActivityAt: ticket.lastActivityAt?.toISOString() || null,
      createdAt: ticket.createdAt?.toISOString() || null,
      updatedAt: ticket.updatedAt?.toISOString() || null,
      client: ticket.client
        ? {
            id: ticket.client.id.toString(),
            companyName: ticket.client.companyName,
            email: ticket.client.email,
            phone: ticket.client.phone,
            address: ticket.client.address,
            city: ticket.client.city,
            postalCode: ticket.client.postalCode,
          }
        : null,
      assignee: ticket.assignee
        ? {
            id: ticket.assignee.id.toString(),
            name: ticket.assignee.name,
            email: ticket.assignee.email,
          }
        : null,
      messages: ticket.messages.map((msg) => ({
        id: msg.id.toString(),
        type: msg.type,
        content: msg.content,
        fromEmail: msg.from_email,
        fromName: msg.from_name,
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
    console.error("[External API] Error fetching ticket:", error)
    return apiError("Internal server error", 500)
  }
}

// PATCH /api/external/support/:id - Update ticket
export async function PATCH(
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

    // Find ticket
    const where = id.startsWith("TKT-")
      ? { ticketNumber: id, tenant_id: context.tenantId }
      : { id: BigInt(id), tenant_id: context.tenantId }

    const existingTicket = await prisma.ticket.findFirst({ where })

    if (!existingTicket) {
      return apiError("Ticket not found", 404)
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    }

    // Allowed fields to update
    if (body.status !== undefined) {
      const validStatuses = ["new", "open", "pending", "resolved", "closed"]
      if (!validStatuses.includes(body.status)) {
        return apiError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400)
      }
      updateData.status = body.status
      if (body.status === "resolved") {
        updateData.resolvedAt = new Date()
      } else if (body.status === "closed") {
        updateData.closedAt = new Date()
      }
    }

    if (body.priority !== undefined) {
      const validPriorities = ["low", "normal", "high", "urgent"]
      if (!validPriorities.includes(body.priority)) {
        return apiError(`Invalid priority. Must be one of: ${validPriorities.join(", ")}`, 400)
      }
      updateData.priority = body.priority
    }

    if (body.tags !== undefined) {
      updateData.tags = Array.isArray(body.tags) ? body.tags.join(",") : body.tags
    }

    if (body.subject !== undefined) {
      updateData.subject = body.subject
    }

    const ticket = await prisma.ticket.update({
      where: { id: existingTicket.id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    })

    return apiSuccess({
      id: ticket.id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      tags: ticket.tags ? ticket.tags.split(",").map((t) => t.trim()) : [],
      updatedAt: ticket.updatedAt?.toISOString() || null,
    })
  } catch (error) {
    console.error("[External API] Error updating ticket:", error)
    return apiError("Internal server error", 500)
  }
}
