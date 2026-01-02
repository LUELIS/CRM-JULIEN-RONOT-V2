import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const ticket = await prisma.ticket.findUnique({
      where: { id: BigInt(id) },
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
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            clients: {
              select: {
                id: true,
                companyName: true,
              },
            },
            ticket_attachments: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket non trouvé" },
        { status: 404 }
      )
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
      responseCount: ticket.responseCount,
      firstResponseAt: ticket.firstResponseAt?.toISOString() || null,
      resolvedAt: ticket.resolvedAt?.toISOString() || null,
      closedAt: ticket.closedAt?.toISOString() || null,
      lastActivityAt: ticket.lastActivityAt?.toISOString() || null,
      createdAt: ticket.createdAt?.toISOString() || null,
      clientId: ticket.clientId?.toString() || null,
      assignedTo: ticket.assignedTo?.toString() || null,
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
      messages: ticket.messages.map((msg) => ({
        id: msg.id.toString(),
        ticketId: msg.ticketId.toString(),
        userId: msg.userId?.toString() || null,
        client_id: msg.client_id?.toString() || null,
        type: msg.type,
        content: msg.content,
        from_email: msg.from_email,
        from_name: msg.from_name,
        isInternal: msg.isInternal,
        createdAt: msg.createdAt?.toISOString() || null,
        user: msg.user
          ? {
              id: msg.user.id.toString(),
              name: msg.user.name,
              email: msg.user.email,
            }
          : null,
        clients: msg.clients
          ? {
              id: msg.clients.id.toString(),
              companyName: msg.clients.companyName,
            }
          : null,
        ticket_attachments: msg.ticket_attachments.map((att) => ({
          id: att.id.toString(),
          ticket_message_id: att.ticket_message_id.toString(),
          filename: att.filename,
          originalName: att.originalName,
          mimeType: att.mimeType,
          size: att.size,
          path: att.path,
        })),
      })),
    })
  } catch (error) {
    console.error("Error fetching ticket:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du ticket" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Handle actions
    if (body.action) {
      let updateData: Record<string, unknown> = {
        lastActivityAt: new Date(),
      }

      switch (body.action) {
        case "assign":
          updateData.assignedTo = body.assignedTo ? BigInt(body.assignedTo) : null
          break
        case "changeStatus":
          updateData.status = body.status
          if (body.status === "resolved") {
            updateData.resolvedAt = new Date()
          } else if (body.status === "closed") {
            updateData.closedAt = new Date()
          }
          break
        case "changePriority":
          updateData.priority = body.priority
          break
        case "reopen":
          updateData.status = "open"
          updateData.resolvedAt = null
          updateData.closedAt = null
          break
        case "attachClient":
          updateData.clientId = body.clientId ? BigInt(body.clientId) : null
          break
        case "detachClient":
          updateData.clientId = null
          break
        case "updateTags":
          updateData.tags = body.tags || null
          break
        default:
          return NextResponse.json(
            { error: "Action non reconnue" },
            { status: 400 }
          )
      }

      const ticket = await prisma.ticket.update({
        where: { id: BigInt(id) },
        data: updateData,
        include: {
          client: true,
          assignee: true,
        },
      })

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
    }

    // Regular update
    const ticket = await prisma.ticket.update({
      where: { id: BigInt(id) },
      data: {
        subject: body.subject,
        clientId: body.clientId ? BigInt(body.clientId) : null,
        senderEmail: body.senderEmail,
        senderName: body.senderName || null,
        priority: body.priority,
        assignedTo: body.assignedTo ? BigInt(body.assignedTo) : null,
        tags: body.tags || null,
        updatedAt: new Date(),
      },
      include: {
        client: true,
        assignee: true,
      },
    })

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
    console.error("Error updating ticket:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du ticket" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete related messages and attachments (cascade should handle it)
    await prisma.ticket.delete({
      where: { id: BigInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting ticket:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du ticket" },
      { status: 500 }
    )
  }
}
