import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateApiToken, apiError, apiSuccess, type ApiContext } from "./auth"

// GET /api/external/support - List tickets
export async function GET(request: NextRequest) {
  const context = await validateApiToken(request)
  if (!context.valid) {
    return apiError(context.error || "Unauthorized", 401)
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const priority = searchParams.get("priority") || ""
    const clientId = searchParams.get("clientId") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const since = searchParams.get("since") || "" // ISO date for updates since

    const where: Record<string, unknown> = {
      tenant_id: context.tenantId,
    }

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { senderEmail: { contains: search } },
        { senderName: { contains: search } },
      ]
    }

    if (status) {
      const statuses = status.split(",")
      if (statuses.length > 1) {
        where.status = { in: statuses }
      } else {
        where.status = status
      }
    }

    if (priority) {
      where.priority = priority
    }

    if (clientId) {
      where.clientId = BigInt(clientId)
    }

    if (since) {
      where.updatedAt = { gte: new Date(since) }
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              email: true,
              phone: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ])

    // Get stats
    const stats = await prisma.ticket.groupBy({
      by: ["status"],
      where: { tenant_id: context.tenantId },
      _count: { status: true },
    })

    const statsMap = stats.reduce(
      (acc, s) => {
        acc[s.status] = s._count.status
        return acc
      },
      {} as Record<string, number>
    )

    return apiSuccess({
      tickets: tickets.map((ticket) => ({
        id: ticket.id.toString(),
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        senderEmail: ticket.senderEmail,
        senderName: ticket.senderName,
        status: ticket.status,
        priority: ticket.priority,
        tags: ticket.tags ? ticket.tags.split(",").map((t) => t.trim()) : [],
        messageCount: ticket._count.messages,
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
            }
          : null,
        assignee: ticket.assignee
          ? {
              id: ticket.assignee.id.toString(),
              name: ticket.assignee.name,
              email: ticket.assignee.email,
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        new: statsMap.new || 0,
        open: statsMap.open || 0,
        pending: statsMap.pending || 0,
        resolved: statsMap.resolved || 0,
        closed: statsMap.closed || 0,
        total,
      },
    })
  } catch (error) {
    console.error("[External API] Error fetching tickets:", error)
    return apiError("Internal server error", 500)
  }
}

// POST /api/external/support - Create ticket
export async function POST(request: NextRequest) {
  const context = await validateApiToken(request)
  if (!context.valid) {
    return apiError(context.error || "Unauthorized", 401)
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.subject) {
      return apiError("Missing required field: subject", 400)
    }
    if (!body.senderEmail) {
      return apiError("Missing required field: senderEmail", 400)
    }

    // Generate ticket number
    const lastTicket = await prisma.ticket.findFirst({
      where: { tenant_id: context.tenantId },
      orderBy: { id: "desc" },
      select: { ticketNumber: true },
    })

    let ticketNumber = "TKT-000001"
    if (lastTicket?.ticketNumber) {
      const num = parseInt(lastTicket.ticketNumber.replace("TKT-", ""))
      ticketNumber = `TKT-${String(num + 1).padStart(6, "0")}`
    }

    // Find or create client by email
    let clientId: bigint | null = null
    if (body.clientId) {
      clientId = BigInt(body.clientId)
    } else if (body.senderEmail) {
      const existingClient = await prisma.client.findFirst({
        where: {
          tenant_id: context.tenantId,
          email: body.senderEmail,
        },
      })
      if (existingClient) {
        clientId = existingClient.id
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenant_id: context.tenantId,
        ticketNumber,
        subject: body.subject,
        clientId,
        senderEmail: body.senderEmail,
        senderName: body.senderName || null,
        status: "new",
        priority: body.priority || "normal",
        tags: Array.isArray(body.tags) ? body.tags.join(",") : body.tags || null,
        createdAt: new Date(),
        lastActivityAt: new Date(),
      },
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

    // Create initial message if content provided
    if (body.content) {
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          client_id: clientId,
          type: "email_in",
          content: body.content,
          from_email: body.senderEmail,
          from_name: body.senderName || null,
          isInternal: false,
          createdAt: new Date(),
        },
      })
    }

    return apiSuccess(
      {
        id: ticket.id.toString(),
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        senderEmail: ticket.senderEmail,
        senderName: ticket.senderName,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt?.toISOString() || null,
        client: ticket.client
          ? {
              id: ticket.client.id.toString(),
              companyName: ticket.client.companyName,
              email: ticket.client.email,
            }
          : null,
      },
      201
    )
  } catch (error) {
    console.error("[External API] Error creating ticket:", error)
    return apiError("Internal server error", 500)
  }
}
