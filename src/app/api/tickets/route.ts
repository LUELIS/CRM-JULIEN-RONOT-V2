import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyNewTicket, parseSlackConfig } from "@/lib/slack"

// Get Slack config from tenant settings
async function getSlackConfig() {
  const tenant = await prisma.tenants.findFirst({
    where: { id: BigInt(1) },
  })
  if (!tenant?.settings) return null
  const settings = JSON.parse(tenant.settings as string)
  return parseSlackConfig(settings)
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const priority = searchParams.get("priority") || ""
    const clientId = searchParams.get("clientId") || ""
    const assignedTo = searchParams.get("assignedTo") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { senderEmail: { contains: search } },
        { senderName: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (clientId) {
      where.clientId = BigInt(clientId)
    }

    if (assignedTo) {
      where.assignedTo = BigInt(assignedTo)
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
            },
          },
          messages: {
            select: { id: true },
          },
        },
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ])

    // Get stats
    const [newCount, openCount, pendingCount, resolvedCount] = await Promise.all([
      prisma.ticket.count({ where: { status: "new" } }),
      prisma.ticket.count({ where: { status: "open" } }),
      prisma.ticket.count({ where: { status: "pending" } }),
      prisma.ticket.count({ where: { status: "resolved" } }),
    ])

    return NextResponse.json({
      tickets: tickets.map((ticket) => ({
        id: ticket.id.toString(),
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        senderEmail: ticket.senderEmail,
        senderName: ticket.senderName,
        status: ticket.status,
        priority: ticket.priority,
        tags: ticket.tags,
        createdAt: ticket.createdAt?.toISOString() || null,
        lastActivityAt: ticket.lastActivityAt?.toISOString() || null,
        closedAt: ticket.closedAt?.toISOString() || null,
        responseCount: ticket.responseCount,
        clientId: ticket.clientId?.toString() || null,
        assignedTo: ticket.assignedTo?.toString() || null,
        messageCount: ticket.messages.length,
        client: ticket.client
          ? {
              id: ticket.client.id.toString(),
              companyName: ticket.client.companyName,
            }
          : null,
        assignee: ticket.assignee
          ? {
              id: ticket.assignee.id.toString(),
              name: ticket.assignee.name,
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
        new: newCount,
        open: openCount,
        pending: pendingCount,
        resolved: resolvedCount,
        total,
      },
    })
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des tickets" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Generate ticket number
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { id: "desc" },
      select: { ticketNumber: true },
    })

    let ticketNumber = "TKT-000001"
    if (lastTicket?.ticketNumber) {
      const num = parseInt(lastTicket.ticketNumber.replace("TKT-", ""))
      ticketNumber = `TKT-${String(num + 1).padStart(6, "0")}`
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenant_id: BigInt(1),
        ticketNumber,
        subject: body.subject,
        clientId: body.clientId ? BigInt(body.clientId) : null,
        senderEmail: body.senderEmail,
        senderName: body.senderName || null,
        status: body.status || "new",
        priority: body.priority || "normal",
        assignedTo: body.assignedTo ? BigInt(body.assignedTo) : null,
        tags: body.tags || null,
        createdAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: {
        client: true,
        assignee: true,
      },
    })

    // Create initial message if content provided
    let initialMessage = null
    if (body.content) {
      initialMessage = await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          client_id: body.clientId ? BigInt(body.clientId) : null,
          type: "email_in",
          content: body.content,
          from_email: body.senderEmail,
          from_name: body.senderName || null,
          isInternal: false,
          createdAt: new Date(),
        },
      })
    }

    // Send Slack notification for new ticket
    try {
      const slackConfig = await getSlackConfig()
      if (slackConfig && slackConfig.slackEnabled && slackConfig.slackNotifyOnNew) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const ticketUrl = `${baseUrl}/tickets/${ticket.id}`

        const result = await notifyNewTicket(
          slackConfig,
          {
            id: ticket.id.toString(),
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            priority: ticket.priority,
            status: ticket.status,
            senderName: ticket.senderName,
            senderEmail: ticket.senderEmail,
            clientName: ticket.client?.companyName || null,
          },
          {
            id: initialMessage?.id.toString() || "0",
            content: body.content || ticket.subject,
            fromName: body.senderName || null,
            fromEmail: body.senderEmail,
          },
          ticketUrl
        )

        // Store Slack thread timestamp if available
        if (result.success && result.slackTs) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { slackTs: result.slackTs },
          })
        }
      }
    } catch (slackError) {
      console.error("Slack notification error:", slackError)
      // Don't fail the request if Slack fails
    }

    return NextResponse.json({
      id: ticket.id.toString(),
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      senderEmail: ticket.senderEmail,
      senderName: ticket.senderName,
      status: ticket.status,
      priority: ticket.priority,
      tags: ticket.tags,
      createdAt: ticket.createdAt?.toISOString() || null,
      lastActivityAt: ticket.lastActivityAt?.toISOString() || null,
      clientId: ticket.clientId?.toString() || null,
      assignedTo: ticket.assignedTo?.toString() || null,
      client: ticket.client
        ? {
            id: ticket.client.id.toString(),
            companyName: ticket.client.companyName,
          }
        : null,
      assignee: ticket.assignee
        ? {
            id: ticket.assignee.id.toString(),
            name: ticket.assignee.name,
          }
        : null,
    })
  } catch (error) {
    console.error("Error creating ticket:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du ticket" },
      { status: 500 }
    )
  }
}
